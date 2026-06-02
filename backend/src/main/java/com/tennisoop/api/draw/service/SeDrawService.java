package com.tennisoop.api.draw.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tennisoop.api.draw.domain.*;
import com.tennisoop.api.draw.mapper.DrawMapper;
import com.tennisoop.api.encounter.domain.TeamEncounter;
import com.tennisoop.api.encounter.mapper.EncounterMapper;
import com.tennisoop.api.encounter.service.EncounterService;
import com.tennisoop.api.exception.BadRequestException;
import com.tennisoop.api.exception.ConflictException;
import com.tennisoop.api.exception.NotFoundException;
import com.tennisoop.api.match.domain.Match;
import com.tennisoop.api.match.domain.MatchStatus;
import com.tennisoop.api.tournament.service.TournamentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SeDrawService {

    private final DrawMapper drawMapper;
    private final TournamentService tournamentService;
    private final EncounterService encounterService;
    private final EncounterMapper encounterMapper;
    private final ObjectMapper objectMapper;

    @Transactional
    public Draw createSeDraw(String tournamentId, CreateDrawRequest request) {
        boolean isDoubles = request.isDoubles();
        List<String> participantIds = request.getParticipantIds();
        if (participantIds == null || participantIds.isEmpty()) {
            throw new BadRequestException("参加者を1名（組）以上指定してください");
        }

        validateParticipantsInTournament(tournamentId, participantIds, isDoubles);

        Map<String, Integer> seeds = request.getSeeds() != null ? request.getSeeds() : new HashMap<>();
        List<Integer> seedValues = new ArrayList<>(seeds.values());
        if (seedValues.size() != new HashSet<>(seedValues).size()) {
            throw new BadRequestException("シード番号が重複しています");
        }

        int participantCount = participantIds.size();
        int totalRounds = (int) Math.ceil(Math.log(participantCount) / Math.log(2));
        if (totalRounds == 0) totalRounds = 1;

        Draw draw = buildBaseDraw(tournamentId, request, DrawService.FORMAT_SE, totalRounds);
        draw.setPlayerIds(serializeIds(participantIds));
        drawMapper.insertDraw(draw);

        createSeSlots(draw.getId(), totalRounds);

        if (!seeds.isEmpty()) {
            int totalSlots = (int) Math.pow(2, totalRounds);
            placeSeedsOnCreate(draw.getId(), seeds, totalSlots, isDoubles);
        }

        Draw result = drawMapper.findById(draw.getId())
            .orElseThrow(() -> new IllegalStateException("作成したドローが見つかりません"));
        result.setSlots(drawMapper.findSlotsByDrawId(draw.getId()));
        result.setPlayerIdList(participantIds);
        log.info("SEドロー作成: id={}, tournamentId={}", draw.getId(), tournamentId);
        return result;
    }

    @Transactional
    public Draw createTeamBattleSeDraw(String tournamentId, CreateDrawRequest request) {
        List<String> teamIds = request.getTeamIds();
        if (teamIds == null || teamIds.isEmpty()) {
            throw new BadRequestException("参加チームを1チーム以上指定してください");
        }

        Map<String, Integer> seeds = request.getSeeds() != null ? request.getSeeds() : new HashMap<>();
        List<Integer> seedValues = new ArrayList<>(seeds.values());
        if (seedValues.size() != new HashSet<>(seedValues).size()) {
            throw new BadRequestException("シード番号が重複しています");
        }

        int participantCount = teamIds.size();
        int totalRounds = (int) Math.ceil(Math.log(participantCount) / Math.log(2));
        if (totalRounds == 0) totalRounds = 1;

        Draw draw = buildBaseDraw(tournamentId, request, DrawService.FORMAT_SE, totalRounds);
        draw.setTeamIds(serializeIds(teamIds));
        draw.setPlayerIds("[]");
        drawMapper.insertDraw(draw);

        createSeSlots(draw.getId(), totalRounds);

        if (!seeds.isEmpty()) {
            int totalSlots = (int) Math.pow(2, totalRounds);
            placeTeamSeedsOnCreate(draw.getId(), seeds, totalSlots);
        }

        Draw result = drawMapper.findById(draw.getId()).orElseThrow();
        result.setSlots(drawMapper.findSlotsByDrawId(draw.getId()));
        result.setTeamIdList(teamIds);
        log.info("団体戦SEドロー作成: id={}, tournamentId={}", draw.getId(), tournamentId);
        return result;
    }

    @Transactional
    public Draw placeSlot(String drawId, String slotId, SlotPlacementRequest request, String userId) {
        Draw draw = drawMapper.findById(drawId)
            .orElseThrow(() -> new NotFoundException("ドローが見つかりません"));
        tournamentService.requireLeader(draw.getTournamentId(), userId);

        DrawSlot slot = drawMapper.findSlotById(slotId)
            .orElseThrow(() -> new NotFoundException("スロットが見つかりません"));

        if (DrawStatus.PUBLISHED.getValue().equals(draw.getStatus()) && slot.getMatchId() != null) {
            MatchStatus matchStatus = MatchStatus.from(slot.getMatchStatus());
            if (matchStatus == MatchStatus.PLAYING || matchStatus == MatchStatus.DONE) {
                throw new ConflictException("確定済みのドローの試合は変更できません（試合が進行中または完了しています）");
            }
        }

        boolean isBye = Boolean.TRUE.equals(request.getIsBye());
        if (!isBye) {
            boolean hasPair   = request.getPairId() != null && !request.getPairId().isBlank();
            boolean hasPlayer = request.getPlayerId() != null && !request.getPlayerId().isBlank();
            if (!hasPair && !hasPlayer) {
                throw new BadRequestException("選手またはペアを選択してください");
            }
            if (hasPair) {
                drawMapper.updateSlotPair(slotId, request.getPairId(), request.getSeedNumber());
            } else {
                drawMapper.updateSlotPlacement(slotId, request.getPlayerId(), request.getSeedNumber(), false);
            }
        } else {
            drawMapper.updateSlotPlacement(slotId, null, null, true);
        }

        draw.setSlots(drawMapper.findSlotsByDrawId(drawId));
        log.info("スロット配置: drawId={}, slotId={}", drawId, slotId);
        return draw;
    }

    @Transactional
    public Draw placeTeamSlot(String drawId, String slotId, String teamId, String userId) {
        Draw draw = drawMapper.findById(drawId)
            .orElseThrow(() -> new NotFoundException("ドローが見つかりません"));
        tournamentService.requireLeader(draw.getTournamentId(), userId);

        if (!DrawService.FORMAT_SE.equals(draw.getFormat())) {
            throw new BadRequestException("SEドローのみチームスロット配置が可能です");
        }

        List<String> teamIds = parseIds(draw.getTeamIds());
        if (!teamIds.contains(teamId)) {
            throw new BadRequestException("このドローに参加していないチームです");
        }

        drawMapper.updateSlotTeam(slotId, teamId);
        draw.setSlots(drawMapper.findSlotsByDrawId(drawId));
        return draw;
    }

    @Transactional
    public Draw autoFill(String drawId, String userId) {
        Draw draw = drawMapper.findById(drawId)
            .orElseThrow(() -> new NotFoundException("ドローが見つかりません"));
        tournamentService.requireLeader(draw.getTournamentId(), userId);

        List<DrawSlot> slots = drawMapper.findSlotsByDrawIdAndRound(drawId, 1);
        List<String> allParticipantIds = parseIds(draw.getPlayerIds());
        boolean isDoubles = draw.isDoubles();

        if (isDoubles) {
            Set<String> usedPairIds = slots.stream()
                .filter(s -> s.getPairId() != null).map(DrawSlot::getPairId).collect(Collectors.toSet());
            List<String> unplacedPairs = new ArrayList<>(allParticipantIds);
            unplacedPairs.removeAll(usedPairIds);
            Collections.shuffle(unplacedPairs);
            for (DrawSlot slot : slots) {
                if (slot.getPairId() != null || slot.isBye()) continue;
                if (!unplacedPairs.isEmpty()) drawMapper.updateSlotPair(slot.getId(), unplacedPairs.remove(0), slot.getSeedNumber());
                else drawMapper.updateSlotPlacement(slot.getId(), null, null, true);
            }
        } else {
            Set<String> usedPlayerIds = slots.stream()
                .filter(s -> s.getPlayerId() != null).map(DrawSlot::getPlayerId).collect(Collectors.toSet());
            List<String> unplacedPlayers = new ArrayList<>(allParticipantIds);
            unplacedPlayers.removeAll(usedPlayerIds);
            Collections.shuffle(unplacedPlayers);
            for (DrawSlot slot : slots) {
                if (slot.getPlayerId() != null || slot.isBye()) continue;
                if (!unplacedPlayers.isEmpty()) drawMapper.updateSlotPlacement(slot.getId(), unplacedPlayers.remove(0), slot.getSeedNumber(), false);
                else drawMapper.updateSlotPlacement(slot.getId(), null, null, true);
            }
        }

        processByeSlots(draw);
        draw.setSlots(drawMapper.findSlotsByDrawId(drawId));
        log.info("ドロー自動埋め: drawId={}", drawId);
        return draw;
    }

    @Transactional
    public Draw clearNonSeeded(String drawId, String userId) {
        Draw draw = drawMapper.findById(drawId)
            .orElseThrow(() -> new NotFoundException("ドローが見つかりません"));
        tournamentService.requireLeader(draw.getTournamentId(), userId);
        drawMapper.clearNonSeededSlots(drawId);
        draw.setSlots(drawMapper.findSlotsByDrawId(drawId));
        return draw;
    }

    @Transactional
    public Draw confirmSeDraw(Draw draw) {
        List<DrawSlot> round1Slots = drawMapper.findSlotsByDrawIdAndRound(draw.getId(), 1);
        for (DrawSlot slot : round1Slots) {
            boolean hasParticipant = slot.getPlayerId() != null || slot.getPairId() != null || slot.getTeamId() != null;
            if (!hasParticipant && !slot.isBye()) {
                drawMapper.updateSlotPlacement(slot.getId(), null, null, true);
            }
        }
        processByeSlots(draw);

        if (DrawService.FORMAT_TEAM_BATTLE.equals(draw.getCategoryType())) {
            List<DrawSlot> slots = drawMapper.findSlotsByDrawIdAndRound(draw.getId(), 1);
            for (int i = 0; i < slots.size() - 1; i += 2) {
                DrawSlot slotA = slots.get(i);
                DrawSlot slotB = slots.get(i + 1);
                if (slotA.getTeamId() == null || slotB.getTeamId() == null) continue;
                TeamEncounter encounter = encounterService.createInternal(
                    draw.getTournamentId(), draw.getCategoryId(), slotA.getTeamId(), slotB.getTeamId(), draw.getId());
                if (encounter == null) {
                    encounter = encounterMapper.findByTeamsAndDraw(draw.getId(), slotA.getTeamId(), slotB.getTeamId()).orElse(null);
                }
                if (encounter != null) {
                    drawMapper.updateSlotEncounterId(slotA.getId(), encounter.getId());
                    drawMapper.updateSlotEncounterId(slotB.getId(), encounter.getId());
                }
            }
        }

        drawMapper.updateDrawStatus(draw.getId(), DrawStatus.PUBLISHED.getValue());
        draw.setStatus(DrawStatus.PUBLISHED.getValue());
        draw.setSlots(drawMapper.findSlotsByDrawId(draw.getId()));
        return draw;
    }

    // --- private helpers ---

    private void validateParticipantsInTournament(String tournamentId, List<String> ids, boolean isDoubles) {
        if (isDoubles) {
            for (String pairId : ids) {
                if (!drawMapper.existsPairInTournament(tournamentId, pairId)) {
                    throw new BadRequestException("参加登録されていないペアが含まれています");
                }
            }
        } else {
            for (String playerId : ids) {
                if (!drawMapper.existsPlayerInTournament(tournamentId, playerId)) {
                    throw new BadRequestException("参加登録されていない選手が含まれています");
                }
            }
        }
    }

    private void createSeSlots(String drawId, int totalRounds) {
        int totalSlots = (int) Math.pow(2, totalRounds);
        for (int position = 1; position <= totalSlots; position++) {
            drawMapper.insertSlot(buildSlot(drawId, 1, position));
        }
        for (int round = 2; round <= totalRounds; round++) {
            int slotsInRound = (int) Math.pow(2, totalRounds - round + 1);
            for (int position = 1; position <= slotsInRound; position++) {
                drawMapper.insertSlot(buildSlot(drawId, round, position));
            }
        }
    }

    private DrawSlot buildSlot(String drawId, int round, int position) {
        DrawSlot slot = new DrawSlot();
        slot.setId(UUID.randomUUID().toString());
        slot.setDrawId(drawId);
        slot.setRound(round);
        slot.setPosition(position);
        slot.setBye(false);
        slot.setCreatedAt(LocalDateTime.now());
        return slot;
    }

    private void placeSeedsOnCreate(String drawId, Map<String, Integer> seeds, int totalSlots, boolean isDoubles) {
        Map<Integer, Integer> positionToSeed = buildPositionToSeedMap(totalSlots);
        Map<Integer, String> seedNumberToId = invertSeeds(seeds);
        List<DrawSlot> round1Slots = drawMapper.findSlotsByDrawIdAndRound(drawId, 1);
        for (DrawSlot slot : round1Slots) {
            Integer seedNum = positionToSeed.get(slot.getPosition());
            if (seedNum == null || !seedNumberToId.containsKey(seedNum)) continue;
            String participantId = seedNumberToId.get(seedNum);
            if (isDoubles) drawMapper.updateSlotPair(slot.getId(), participantId, seedNum);
            else drawMapper.updateSlotPlacement(slot.getId(), participantId, seedNum, false);
        }
    }

    private void placeTeamSeedsOnCreate(String drawId, Map<String, Integer> seeds, int totalSlots) {
        Map<Integer, Integer> positionToSeed = buildPositionToSeedMap(totalSlots);
        Map<Integer, String> seedNumberToId = invertSeeds(seeds);
        List<DrawSlot> round1Slots = drawMapper.findSlotsByDrawIdAndRound(drawId, 1);
        for (DrawSlot slot : round1Slots) {
            Integer seedNum = positionToSeed.get(slot.getPosition());
            if (seedNum == null || !seedNumberToId.containsKey(seedNum)) continue;
            drawMapper.updateSlotTeamWithSeed(slot.getId(), seedNumberToId.get(seedNum), seedNum);
        }
    }

    private Map<Integer, Integer> buildPositionToSeedMap(int totalSlots) {
        List<Integer> seedPositions = generateSeedPositions(totalSlots);
        Map<Integer, Integer> positionToSeed = new HashMap<>();
        for (int i = 0; i < Math.min(seedPositions.size(), 32); i++) {
            positionToSeed.put(seedPositions.get(i), i + 1);
        }
        return positionToSeed;
    }

    private Map<Integer, String> invertSeeds(Map<String, Integer> seeds) {
        Map<Integer, String> result = new HashMap<>();
        for (Map.Entry<String, Integer> e : seeds.entrySet()) result.put(e.getValue(), e.getKey());
        return result;
    }

    private List<Integer> generateSeedPositions(int n) {
        if (n <= 2) {
            List<Integer> r = new ArrayList<>();
            for (int i = 1; i <= n; i++) r.add(i);
            return r;
        }
        List<Integer> half = generateSeedPositions(n / 2);
        Integer[] full = new Integer[n];
        for (int i = 0; i < n / 2; i++) {
            int oldPos = half.get(i);
            int seed   = i + 1;
            int newPos = 2 * oldPos - (oldPos % 2);
            full[seed - 1] = newPos;
            int newSeed = n + 1 - seed;
            int adjPos  = (newPos % 2 == 0) ? newPos - 1 : newPos + 1;
            full[newSeed - 1] = adjPos;
        }
        return Arrays.asList(full);
    }

    void processByeSlots(Draw draw) {
        for (int round = 1; round < draw.getTotalRounds(); round++) {
            List<DrawSlot> roundSlots = drawMapper.findSlotsByDrawIdAndRound(draw.getId(), round);
            roundSlots.sort(Comparator.comparingInt(DrawSlot::getPosition));
            List<DrawSlot> nextRoundSlots = drawMapper.findSlotsByDrawIdAndRound(draw.getId(), round + 1);
            for (int i = 0; i < roundSlots.size() - 1; i += 2) {
                DrawSlot slotA = roundSlots.get(i);
                DrawSlot slotB = roundSlots.get(i + 1);
                int nextPos = (int) Math.ceil(slotA.getPosition() / 2.0);
                DrawSlot nextSlot = nextRoundSlots.stream()
                    .filter(s -> s.getPosition() == nextPos).findFirst().orElse(null);
                if (nextSlot == null) continue;
                if (slotA.isBye() && slotB.isBye()) {
                    drawMapper.updateSlotPlacement(nextSlot.getId(), null, null, true);
                } else if (slotA.isBye() && hasParticipant(slotB)) {
                    advanceSlot(nextSlot.getId(), slotB);
                } else if (slotB.isBye() && hasParticipant(slotA)) {
                    advanceSlot(nextSlot.getId(), slotA);
                }
            }
        }
    }

    private boolean hasParticipant(DrawSlot slot) {
        return slot.getPlayerId() != null || slot.getPairId() != null || slot.getTeamId() != null;
    }

    private void advanceSlot(String nextSlotId, DrawSlot from) {
        if (from.getPairId() != null) drawMapper.updateSlotPair(nextSlotId, from.getPairId(), null);
        else if (from.getPlayerId() != null) drawMapper.updateSlotPlayer(nextSlotId, from.getPlayerId());
        else if (from.getTeamId() != null) drawMapper.updateSlotTeam(nextSlotId, from.getTeamId());
    }

    Draw buildBaseDraw(String tournamentId, CreateDrawRequest request, String format, int totalRounds) {
        Draw draw = new Draw();
        draw.setId(UUID.randomUUID().toString());
        draw.setTournamentId(tournamentId);
        draw.setCategoryId(request.getCategoryId());
        draw.setName(request.getName());
        draw.setFormat(format);
        draw.setStatus(DrawStatus.DRAFT.getValue());
        draw.setTotalRounds(totalRounds);
        draw.setCreatedAt(LocalDateTime.now());
        draw.setUpdatedAt(LocalDateTime.now());
        return draw;
    }

    List<String> parseIds(String json) {
        return DrawJsonUtils.parseIds(json, objectMapper);
    }

    String serializeIds(List<String> ids) {
        return DrawJsonUtils.serializeIds(ids, objectMapper);
    }
}
