package com.tennisoop.api.draw;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tennisoop.api.draw.domain.*;
import com.tennisoop.api.draw.mapper.DrawMapper;
import com.tennisoop.api.draw.service.DrawService;
import com.tennisoop.api.draw.service.RrDrawService;
import com.tennisoop.api.draw.service.SeDrawService;
import com.tennisoop.api.draw.service.StandingsCalculator;
import com.tennisoop.api.exception.BadRequestException;
import com.tennisoop.api.exception.ConflictException;
import com.tennisoop.api.exception.NotFoundException;
import com.tennisoop.api.encounter.mapper.EncounterMapper;
import com.tennisoop.api.encounter.service.EncounterService;
import com.tennisoop.api.match.mapper.MatchMapper;
import com.tennisoop.api.tournament.service.TournamentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.*;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class DrawServiceTest {

    @Mock private DrawMapper drawMapper;
    @Mock private MatchMapper matchMapper;
    @Mock private TournamentService tournamentService;
    @Mock private EncounterService encounterService;
    @Mock private EncounterMapper encounterMapper;

    private DrawService drawService;

    private static final String TOURNAMENT_ID = "tournament-id";
    private static final String USER_ID       = "user-id";
    private static final String CATEGORY_ID   = "category-id";
    private static final String DRAW_ID       = "draw-id";

    /** insertSlot で追加されたスロットを findSlots* から返せるようにするインメモリストア */
    private List<DrawSlot> slotStore;
    /** insertDraw で追加されたドローを findById から返せるようにするインメモリストア */
    private List<Draw> drawStore;

    @BeforeEach
    void setUp() {
        ObjectMapper objectMapper = new ObjectMapper();
        StandingsCalculator standingsCalculator = new StandingsCalculator(objectMapper);
        SeDrawService seDrawService = new SeDrawService(drawMapper, tournamentService, encounterService, encounterMapper, objectMapper);
        RrDrawService rrDrawService = new RrDrawService(drawMapper, matchMapper, tournamentService, encounterService, encounterMapper, objectMapper, standingsCalculator);
        drawService = new DrawService(drawMapper, matchMapper, tournamentService, seDrawService, rrDrawService, objectMapper);
        slotStore   = new ArrayList<>();
        drawStore   = new ArrayList<>();

        // insertDraw → drawStore に蓄積
        doAnswer(inv -> { drawStore.add(inv.getArgument(0)); return null; })
            .when(drawMapper).insertDraw(any(Draw.class));

        // findById → drawStore から検索
        lenient().when(drawMapper.findById(anyString()))
            .thenAnswer(inv -> {
                String id = inv.getArgument(0);
                return drawStore.stream().filter(d -> d.getId().equals(id)).findFirst();
            });

        // insertSlot → slotStore に蓄積
        doAnswer(inv -> { slotStore.add(inv.getArgument(0)); return null; })
            .when(drawMapper).insertSlot(any(DrawSlot.class));

        // findSlotsByDrawId → slotStore から全件
        lenient().when(drawMapper.findSlotsByDrawId(anyString()))
            .thenAnswer(inv -> new ArrayList<>(slotStore));

        // findSlotsByDrawIdAndRound → ラウンドでフィルタ
        lenient().when(drawMapper.findSlotsByDrawIdAndRound(anyString(), anyInt()))
            .thenAnswer(inv -> {
                int round = inv.getArgument(1);
                return slotStore.stream()
                    .filter(s -> s.getRound() == round)
                    .collect(Collectors.toList());
            });

        // 権限チェックは常に通す
        lenient().doNothing().when(tournamentService).requireLeader(anyString(), anyString());
        lenient().doNothing().when(tournamentService).requireAccess(anyString(), anyString());
    }

    // =========================================================
    // create: バリデーション
    // =========================================================

    @Nested
    @DisplayName("create: バリデーション")
    class CreateValidation {

        @Test
        @DisplayName("参加者が空のとき BadRequestException をスロー")
        void emptyParticipants_throwsBadRequest() {
            setupValidCategory();
            assertThatThrownBy(() -> drawService.create(TOURNAMENT_ID, singlesRequest(List.of()), USER_ID))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("参加者を1名（組）以上");
        }

        @Test
        @DisplayName("未登録選手が含まれるとき BadRequestException をスロー")
        void unregisteredPlayer_throwsBadRequest() {
            setupValidCategory();
            when(drawMapper.existsPlayerInTournament(TOURNAMENT_ID, "p1")).thenReturn(false);

            assertThatThrownBy(() -> drawService.create(TOURNAMENT_ID, singlesRequest(List.of("p1", "p2")), USER_ID))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("参加登録されていない選手");
        }

        @Test
        @DisplayName("未登録ペアが含まれるとき BadRequestException をスロー")
        void unregisteredPair_throwsBadRequest() {
            setupValidCategory();
            when(drawMapper.existsPairInTournament(TOURNAMENT_ID, "pair1")).thenReturn(false);

            assertThatThrownBy(() -> drawService.create(TOURNAMENT_ID, doublesRequest(List.of("pair1", "pair2")), USER_ID))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("参加登録されていないペア");
        }

        @Test
        @DisplayName("シード番号が重複するとき BadRequestException をスロー")
        void duplicateSeedNumbers_throwsBadRequest() {
            setupAllPlayersRegistered(List.of("p1", "p2", "p3", "p4"));

            CreateDrawRequest req = singlesRequest(List.of("p1", "p2", "p3", "p4"));
            req.setSeeds(Map.of("p1", 1, "p2", 1));

            assertThatThrownBy(() -> drawService.create(TOURNAMENT_ID, req, USER_ID))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("シード番号が重複");
        }

        @Test
        @DisplayName("同名ドローが存在するとき ConflictException をスロー")
        void duplicateName_throwsConflict() {
            when(drawMapper.existsCategoryInTournament(anyString(), anyString())).thenReturn(true);
            when(drawMapper.existsByTournamentCategoryName(TOURNAMENT_ID, CATEGORY_ID, "テストドロー")).thenReturn(true);

            assertThatThrownBy(() -> drawService.create(TOURNAMENT_ID, singlesRequest(List.of("p1")), USER_ID))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("同名のドローが存在");
        }

        @Test
        @DisplayName("存在しないカテゴリを指定すると NotFoundException をスロー")
        void unknownCategory_throwsNotFound() {
            when(drawMapper.existsCategoryInTournament(anyString(), anyString())).thenReturn(false);

            assertThatThrownBy(() -> drawService.create(TOURNAMENT_ID, singlesRequest(List.of("p1")), USER_ID))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("カテゴリが見つかりません");
        }
    }

    // =========================================================
    // create: ラウンド数・スロット数の算出
    // =========================================================

    @Nested
    @DisplayName("create: ラウンド数・スロット数の算出")
    class CreateSlotCount {

        @Test
        @DisplayName("2人 → 1ラウンド・スロット合計2")
        void twoPlayers_generates1RoundAnd2Slots() {
            List<String> players = List.of("p1", "p2");
            setupAllPlayersRegistered(players);

            Draw draw = drawService.create(TOURNAMENT_ID, singlesRequest(players), USER_ID);

            assertThat(draw.getTotalRounds()).isEqualTo(1);
            assertThat(slotStore).hasSize(2);
            assertThat(slotStore).allMatch(s -> s.getRound() == 1);
        }

        @Test
        @DisplayName("4人 → 2ラウンド・スロット合計6（R1:4、R2:2）")
        void fourPlayers_generates2RoundsAnd6Slots() {
            List<String> players = List.of("p1", "p2", "p3", "p4");
            setupAllPlayersRegistered(players);

            Draw draw = drawService.create(TOURNAMENT_ID, singlesRequest(players), USER_ID);

            assertThat(draw.getTotalRounds()).isEqualTo(2);
            assertThat(slotStore).hasSize(6);
            assertThat(slotStore.stream().filter(s -> s.getRound() == 1).count()).isEqualTo(4);
            assertThat(slotStore.stream().filter(s -> s.getRound() == 2).count()).isEqualTo(2);
        }

        @Test
        @DisplayName("5人（バイあり）→ 3ラウンド・スロット合計14（R1:8、R2:4、R3:2）")
        void fivePlayers_generates3RoundsAnd14Slots() {
            List<String> players = List.of("p1", "p2", "p3", "p4", "p5");
            setupAllPlayersRegistered(players);

            Draw draw = drawService.create(TOURNAMENT_ID, singlesRequest(players), USER_ID);

            assertThat(draw.getTotalRounds()).isEqualTo(3);
            assertThat(slotStore).hasSize(14);
            assertThat(slotStore.stream().filter(s -> s.getRound() == 1).count()).isEqualTo(8);
            assertThat(slotStore.stream().filter(s -> s.getRound() == 2).count()).isEqualTo(4);
            assertThat(slotStore.stream().filter(s -> s.getRound() == 3).count()).isEqualTo(2);
        }

        @Test
        @DisplayName("8人 → 3ラウンド・スロット合計14")
        void eightPlayers_generates3RoundsAnd14Slots() {
            List<String> players = List.of("p1","p2","p3","p4","p5","p6","p7","p8");
            setupAllPlayersRegistered(players);

            Draw draw = drawService.create(TOURNAMENT_ID, singlesRequest(players), USER_ID);

            assertThat(draw.getTotalRounds()).isEqualTo(3);
            assertThat(slotStore).hasSize(14);
        }

        @Test
        @DisplayName("16人 → 4ラウンド・スロット合計30（R1:16、R2:8、R3:4、R4:2）")
        void sixteenPlayers_generates4RoundsAnd30Slots() {
            List<String> players = new ArrayList<>();
            for (int i = 1; i <= 16; i++) players.add("p" + i);
            setupAllPlayersRegistered(players);

            Draw draw = drawService.create(TOURNAMENT_ID, singlesRequest(players), USER_ID);

            assertThat(draw.getTotalRounds()).isEqualTo(4);
            assertThat(slotStore).hasSize(30);
        }

        @Test
        @DisplayName("各ラウンドのスロット position は 1 から連続する")
        void slotPositions_areConsecutiveFromOne() {
            List<String> players = List.of("p1", "p2", "p3", "p4");
            setupAllPlayersRegistered(players);

            drawService.create(TOURNAMENT_ID, singlesRequest(players), USER_ID);

            List<Integer> r1Positions = slotStore.stream()
                .filter(s -> s.getRound() == 1)
                .map(DrawSlot::getPosition)
                .sorted()
                .collect(Collectors.toList());
            assertThat(r1Positions).containsExactly(1, 2, 3, 4);

            List<Integer> r2Positions = slotStore.stream()
                .filter(s -> s.getRound() == 2)
                .map(DrawSlot::getPosition)
                .sorted()
                .collect(Collectors.toList());
            assertThat(r2Positions).containsExactly(1, 2);
        }
    }

    // =========================================================
    // create: シード配置
    // =========================================================

    @Nested
    @DisplayName("create: シード配置")
    class CreateSeedPlacement {

        @BeforeEach
        void setupSlotMutation() {
            // updateSlotPlacement でスロットの状態を更新する
            doAnswer(inv -> {
                String slotId   = inv.getArgument(0);
                String playerId = inv.getArgument(1);
                Integer seed    = inv.getArgument(2);
                slotStore.stream().filter(s -> s.getId().equals(slotId)).findFirst()
                    .ifPresent(s -> { s.setPlayerId(playerId); s.setSeedNumber(seed); });
                return null;
            }).when(drawMapper).updateSlotPlacement(anyString(), anyString(), any(), anyBoolean());
        }

        @Test
        @DisplayName("4人ドローで第1シードが R1 position 1 に配置される")
        void seed1_placedAtPosition1InRound1() {
            List<String> players = List.of("p1", "p2", "p3", "p4");
            setupAllPlayersRegistered(players);

            CreateDrawRequest req = singlesRequest(players);
            req.setSeeds(Map.of("p1", 1));
            drawService.create(TOURNAMENT_ID, req, USER_ID);

            DrawSlot seed1 = slotStore.stream()
                .filter(s -> "p1".equals(s.getPlayerId()))
                .findFirst().orElseThrow();
            assertThat(seed1.getRound()).isEqualTo(1);
            assertThat(seed1.getPosition()).isEqualTo(1);
            assertThat(seed1.getSeedNumber()).isEqualTo(1);
        }

        @Test
        @DisplayName("4人ドローで第1・第2シードが決勝まで対戦しない位置（1と4）に配置される")
        void seed1And2_placedInOppositeHalves() {
            List<String> players = List.of("p1", "p2", "p3", "p4");
            setupAllPlayersRegistered(players);

            CreateDrawRequest req = singlesRequest(players);
            req.setSeeds(Map.of("p1", 1, "p2", 2));
            drawService.create(TOURNAMENT_ID, req, USER_ID);

            DrawSlot seed1 = slotStore.stream().filter(s -> "p1".equals(s.getPlayerId())).findFirst().orElseThrow();
            DrawSlot seed2 = slotStore.stream().filter(s -> "p2".equals(s.getPlayerId())).findFirst().orElseThrow();

            // 4人ドロー: シード1=pos1、シード2=pos4 → 反対側のブロック
            assertThat(seed1.getPosition()).isEqualTo(1);
            assertThat(seed2.getPosition()).isEqualTo(4);
        }

        @Test
        @DisplayName("8人ドローで第1・第2シードが反対側のブロックに配置される")
        void eightPlayers_seed1And2_inOppositeHalves() {
            List<String> players = List.of("p1","p2","p3","p4","p5","p6","p7","p8");
            setupAllPlayersRegistered(players);

            CreateDrawRequest req = singlesRequest(players);
            req.setSeeds(Map.of("p1", 1, "p2", 2));
            drawService.create(TOURNAMENT_ID, req, USER_ID);

            DrawSlot seed1 = slotStore.stream().filter(s -> "p1".equals(s.getPlayerId())).findFirst().orElseThrow();
            DrawSlot seed2 = slotStore.stream().filter(s -> "p2".equals(s.getPlayerId())).findFirst().orElseThrow();

            // 8人ドロー: pos1〜4が上半分、pos5〜8が下半分
            assertThat(seed1.getPosition()).isLessThanOrEqualTo(4);
            assertThat(seed2.getPosition()).isGreaterThanOrEqualTo(5);
        }
    }

    // =========================================================
    // confirm
    // =========================================================

    @Nested
    @DisplayName("confirm")
    class Confirm {

        @Test
        @DisplayName("すでに PUBLISHED のドローを確定しようとすると ConflictException")
        void alreadyPublished_throwsConflict() {
            when(drawMapper.findById(DRAW_ID)).thenReturn(Optional.of(buildDraw(DrawStatus.PUBLISHED.getValue(), 1)));

            assertThatThrownBy(() -> drawService.confirm(DRAW_ID, USER_ID))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("すでに確定済み");
        }

        @Test
        @DisplayName("DRAFT のドローを確定すると updateDrawStatus が PUBLISHED で呼ばれる")
        void draft_updatesStatusToPublished() {
            when(drawMapper.findById(DRAW_ID)).thenReturn(Optional.of(buildDraw(DrawStatus.DRAFT.getValue(), 1)));
            slotStore.add(buildSlot("s1", 1, 1));

            drawService.confirm(DRAW_ID, USER_ID);

            verify(drawMapper).updateDrawStatus(DRAW_ID, DrawStatus.PUBLISHED.getValue());
        }

        @Test
        @DisplayName("R1 に未配置スロットがある場合は bye として処理される")
        void emptySlot_treatedAsBye() {
            when(drawMapper.findById(DRAW_ID)).thenReturn(Optional.of(buildDraw(DrawStatus.DRAFT.getValue(), 2)));
            // R1: 配置済み1枠・空き1枠
            DrawSlot placed = buildSlot("s1", 1, 1);
            placed.setPlayerId("p1");
            DrawSlot empty  = buildSlot("s2", 1, 2);
            slotStore.addAll(List.of(placed, empty));
            // R2
            slotStore.add(buildSlot("s3", 2, 1));

            drawService.confirm(DRAW_ID, USER_ID);

            // 空きスロットが bye に変換されたことを確認
            verify(drawMapper).updateSlotPlacement(eq("s2"), isNull(), isNull(), eq(true));
        }
    }

    // =========================================================
    // delete
    // =========================================================

    @Nested
    @DisplayName("delete")
    class Delete {

        @Test
        @DisplayName("存在しないドローを削除すると NotFoundException")
        void notFound_throwsNotFoundException() {
            when(drawMapper.findById(DRAW_ID)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> drawService.delete(DRAW_ID, USER_ID))
                .isInstanceOf(NotFoundException.class);
        }

        @Test
        @DisplayName("ドロー削除で drawMapper.deleteDraw が呼ばれる")
        void callsDeleteDraw() {
            when(drawMapper.findById(DRAW_ID)).thenReturn(Optional.of(buildDraw(DrawStatus.DRAFT.getValue(), 1)));

            drawService.delete(DRAW_ID, USER_ID);

            verify(drawMapper).deleteDraw(DRAW_ID);
        }
    }

    // =========================================================
    // findById
    // =========================================================

    @Nested
    @DisplayName("findById")
    class FindById {

        @Test
        @DisplayName("存在しないドローを取得すると NotFoundException")
        void notFound_throwsNotFoundException() {
            when(drawMapper.findById(DRAW_ID)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> drawService.findById(DRAW_ID, USER_ID))
                .isInstanceOf(NotFoundException.class);
        }
    }

    // =========================================================
    // ヘルパー
    // =========================================================

    private void setupValidCategory() {
        lenient().when(drawMapper.existsCategoryInTournament(anyString(), anyString())).thenReturn(true);
        lenient().when(drawMapper.existsByTournamentCategoryName(anyString(), anyString(), anyString())).thenReturn(false);
    }

    private void setupAllPlayersRegistered(List<String> playerIds) {
        setupValidCategory();
        lenient().when(drawMapper.existsPlayerInTournament(eq(TOURNAMENT_ID), anyString())).thenReturn(true);
        lenient().when(drawMapper.existsPairInTournament(eq(TOURNAMENT_ID), anyString())).thenReturn(true);
    }

    private CreateDrawRequest singlesRequest(List<String> playerIds) {
        CreateDrawRequest req = new CreateDrawRequest();
        req.setCategoryId(CATEGORY_ID);
        req.setName("テストドロー");
        req.setPlayerIds(new ArrayList<>(playerIds));
        return req;
    }

    private CreateDrawRequest doublesRequest(List<String> pairIds) {
        CreateDrawRequest req = new CreateDrawRequest();
        req.setCategoryId(CATEGORY_ID);
        req.setName("テストドロー");
        req.setPairIds(new ArrayList<>(pairIds));
        return req;
    }

    private Draw buildDraw(String status, int totalRounds) {
        Draw draw = new Draw();
        draw.setId(DRAW_ID);
        draw.setTournamentId(TOURNAMENT_ID);
        draw.setCategoryId(CATEGORY_ID);
        draw.setStatus(status);
        draw.setTotalRounds(totalRounds);
        return draw;
    }

    private DrawSlot buildSlot(String id, int round, int position) {
        DrawSlot slot = new DrawSlot();
        slot.setId(id);
        slot.setDrawId(DRAW_ID);
        slot.setRound(round);
        slot.setPosition(position);
        return slot;
    }
}
