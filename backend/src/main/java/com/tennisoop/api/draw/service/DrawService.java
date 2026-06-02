package com.tennisoop.api.draw.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tennisoop.api.draw.domain.*;
import com.tennisoop.api.draw.mapper.DrawMapper;
import com.tennisoop.api.encounter.domain.TeamEncounter;
import com.tennisoop.api.exception.BadRequestException;
import com.tennisoop.api.exception.ConflictException;
import com.tennisoop.api.exception.NotFoundException;
import com.tennisoop.api.match.domain.Match;
import com.tennisoop.api.match.domain.MatchStatus;
import com.tennisoop.api.match.mapper.MatchMapper;
import com.tennisoop.api.tournament.service.TournamentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class DrawService {

    public static final String FORMAT_RR          = "round_robin";
    public static final String FORMAT_SE          = "single_elimination";
    public static final String FORMAT_TEAM_BATTLE = "team_battle";
    public static final int    RR_MIN_PARTICIPANTS = 3;
    public static final int    RR_MAX_PARTICIPANTS = 8;

    private final DrawMapper drawMapper;
    private final MatchMapper matchMapper;
    private final TournamentService tournamentService;
    private final SeDrawService seDrawService;
    private final RrDrawService rrDrawService;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public List<Draw> findByTournamentId(String tournamentId, String userId) {
        tournamentService.requireAccess(tournamentId, userId);
        return drawMapper.findByTournamentId(tournamentId);
    }

    @Transactional(readOnly = true)
    public Draw findById(String drawId, String userId) {
        Draw draw = drawMapper.findById(drawId)
            .orElseThrow(() -> new NotFoundException("ドローが見つかりません"));
        tournamentService.requireAccess(draw.getTournamentId(), userId);

        if (FORMAT_RR.equals(draw.getFormat())) {
            if (FORMAT_TEAM_BATTLE.equals(draw.getCategoryType())) {
                rrDrawService.populateTeamBattleRrFields(draw);
            } else {
                rrDrawService.populateRrFields(draw);
            }
        } else {
            draw.setSlots(drawMapper.findSlotsByDrawId(drawId));
            if (FORMAT_TEAM_BATTLE.equals(draw.getCategoryType())) {
                draw.setTeamIdList(parseIds(draw.getTeamIds()));
                draw.setEncounters(rrDrawService.loadEncountersWithRubbers(draw));
            } else {
                draw.setPlayerIdList(parseIds(draw.getPlayerIds()));
            }
        }
        return draw;
    }

    @Transactional
    public Draw create(String tournamentId, CreateDrawRequest request, String userId) {
        tournamentService.requireLeader(tournamentId, userId);

        if (!drawMapper.existsCategoryInTournament(tournamentId, request.getCategoryId())) {
            throw new NotFoundException("カテゴリが見つかりません");
        }
        if (drawMapper.existsByTournamentCategoryName(tournamentId, request.getCategoryId(), request.getName())) {
            throw new ConflictException("同じカテゴリに同名のドローが存在します");
        }

        String format = request.getFormat() != null ? request.getFormat() : FORMAT_SE;
        log.info("ドロー作成: format={}, name={}, tournamentId={}", format, request.getName(), tournamentId);

        if (request.isTeamBattle()) {
            if (request.getRubbers() == null || request.getRubbers().isBlank()) {
                throw new BadRequestException("団体戦ドローにはラバー構成が必要です");
            }
            drawMapper.updateCategoryRubbers(request.getCategoryId(), request.getRubbers());
            return FORMAT_RR.equals(format)
                ? rrDrawService.createTeamBattleRrDraw(tournamentId, request)
                : seDrawService.createTeamBattleSeDraw(tournamentId, request);
        }

        return FORMAT_RR.equals(format)
            ? rrDrawService.createRrDraw(tournamentId, request)
            : seDrawService.createSeDraw(tournamentId, request);
    }

    @Transactional
    public void delete(String drawId, String userId) {
        Draw draw = drawMapper.findById(drawId)
            .orElseThrow(() -> new NotFoundException("ドローが見つかりません"));
        tournamentService.requireLeader(draw.getTournamentId(), userId);

        if (FORMAT_RR.equals(draw.getFormat())) {
            matchMapper.deletePendingByDrawId(drawId);
            matchMapper.nullifyDrawIdForNonPending(drawId);
        } else {
            List<String> matchIds = drawMapper.findMatchIdsByDrawId(drawId);
            for (String matchId : matchIds) {
                Match match = matchMapper.findById(matchId).orElse(null);
                if (match != null && MatchStatus.PENDING.getValue().equals(match.getStatus())) {
                    matchMapper.delete(matchId);
                }
            }
        }

        drawMapper.deleteDraw(drawId);
        log.info("ドロー削除: id={}, format={}", drawId, draw.getFormat());
    }

    @Transactional
    public Draw confirm(String drawId, String userId) {
        Draw draw = drawMapper.findById(drawId)
            .orElseThrow(() -> new NotFoundException("ドローが見つかりません"));
        tournamentService.requireLeader(draw.getTournamentId(), userId);

        if (DrawStatus.PUBLISHED.getValue().equals(draw.getStatus())) {
            throw new ConflictException("すでに確定済みのドローです");
        }

        if (FORMAT_RR.equals(draw.getFormat())) {
            drawMapper.updateDrawStatus(drawId, DrawStatus.PUBLISHED.getValue());
            draw.setStatus(DrawStatus.PUBLISHED.getValue());
            rrDrawService.populateRrFields(draw);
        } else {
            seDrawService.confirmSeDraw(draw);
        }

        log.info("ドロー確定: id={}", drawId);
        return draw;
    }

    // --- SE 委譲 ---

    @Transactional
    public Draw placeSlot(String drawId, String slotId, SlotPlacementRequest request, String userId) {
        return seDrawService.placeSlot(drawId, slotId, request, userId);
    }

    @Transactional
    public Draw placeTeamSlot(String drawId, String slotId, String teamId, String userId) {
        return seDrawService.placeTeamSlot(drawId, slotId, teamId, userId);
    }

    @Transactional
    public Draw autoFill(String drawId, String userId) {
        return seDrawService.autoFill(drawId, userId);
    }

    @Transactional
    public Draw clearNonSeeded(String drawId, String userId) {
        return seDrawService.clearNonSeeded(drawId, userId);
    }

    // --- RR 委譲 ---

    @Transactional
    public int generateMatches(String drawId, String userId) {
        return rrDrawService.generateMatches(drawId, userId);
    }

    @Transactional(readOnly = true)
    public List<RrStanding> getStandings(String drawId, String userId) {
        return rrDrawService.getStandings(drawId, userId);
    }

    @Transactional(readOnly = true)
    public List<RrTeamStanding> getTeamBattleStandings(String drawId, String userId) {
        return rrDrawService.getTeamBattleStandings(drawId, userId);
    }

    @Transactional(readOnly = true)
    public List<RrStanding> getStandingsForDraw(Draw draw) {
        return rrDrawService.getStandingsForDraw(draw);
    }

    @Transactional(readOnly = true)
    public List<TeamEncounter> getEncountersForPublicDraw(Draw draw) {
        return rrDrawService.getEncountersForPublicDraw(draw);
    }

    @Transactional(readOnly = true)
    public List<RrTeamStanding> getTeamStandingsFromEncounters(Draw draw, List<TeamEncounter> encounters) {
        return rrDrawService.getTeamStandingsFromEncounters(draw, encounters);
    }

    @Transactional
    public int addAllToOop(String drawId, RrBulkOopRequest request, String userId) {
        return rrDrawService.addAllToOop(drawId, request, userId);
    }

    @Transactional
    public void addMatchToOop(String drawId, String matchId, RrSingleOopRequest request, String userId) {
        rrDrawService.addMatchToOop(drawId, matchId, request, userId);
    }

    // --- shared helper ---

    private List<String> parseIds(String json) {
        return DrawJsonUtils.parseIds(json, objectMapper);
    }
}
