package com.tennisoop.api.draw.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.tennisoop.api.encounter.domain.TeamEncounter;
import com.tennisoop.api.match.domain.MatchType;
import com.tennisoop.api.tournament.domain.CategoryType;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
public class Draw {
    private String id;
    private String tournamentId;
    private String categoryId;
    private String categoryName;
    private String categoryType;

    public boolean isDoubles() {
        return CategoryType.DOUBLES.getValue().equals(categoryType);
    }
    private String name;
    private String format;
    private String status;
    private int totalRounds;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // SE用
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private List<DrawSlot> slots;

    // RR用
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private List<RrPlayer> players;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private List<RrMatchEntry> matches;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private Boolean matchesGenerated;

    // 団体戦RR用
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private List<TeamEncounter> encounters;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private List<RrTeamStanding> teamStandings;

    @JsonIgnore
    private String playerIds;

    @JsonIgnore
    private String teamIds;

    // team_battle SE用: フロントに公開するチームIDリスト
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private List<String> teamIdList;

    // singles/doubles SE用: フロントに公開する選手/ペアIDリスト
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private List<String> playerIdList;
}
