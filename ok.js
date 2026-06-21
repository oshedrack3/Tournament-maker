const enableGroups = document.getElementById("enableGroups");
const groupOptions = document.getElementById("groupOptions");

enableGroups.addEventListener("change", () => {
  
  groupOptions.style.display =
    enableGroups.checked ? "block" : "none";
  
});



function getTournamentSettings() {
  
  const tournament =
    getCurrentTournament();
  
  if (
    tournament &&
    tournament.settings
  ) {
    
    return tournament.settings;
  }
  
  return {
    
    enableGroups:
      document.getElementById(
        "enableGroups"
      )?.checked || false,
    
    teamsPerGroup:
      parseInt(
        document.getElementById(
          "teamsPerGroup"
        )?.value
      ) || 4,
    
    teamsQualify:
      parseInt(
        document.getElementById(
          "teamsQualify"
        )?.value
      ) || 2,
    
    knockoutSize:
      parseInt(
        document.getElementById(
          "knockoutRound"
        )?.value
      ) || 8
  };
}


function generateTournament() {
  const tournament = getCurrentTournament();
  if (!tournament) return;
  
  const teams = [...tournament.teams];
  
  if (teams.length < 2) {
    showAlert("❌ Add at least 2 teams");
    return;
  }
  
  const enableGroups = document.getElementById("enableGroups").checked;
  
  const teamsPerGroup =
    parseInt(document.getElementById("teamsPerGroup").value) || 4;
  
  const teamsQualify =
    parseInt(document.getElementById("teamsQualify").value) || 2;
  
  const knockoutSize =
    parseInt(document.getElementById("knockoutRound").value);
  
  // SAVE SETTINGS
  tournament.settings = {
    enableGroups,
    teamsPerGroup,
    teamsQualify,
    knockoutSize
  };
  
  tournament.matches = [];
  tournament.groups = [];
  tournament.knockout = {
    R16: [],
    QF: [],
    SF: [],
    FINAL: null
  };
  
  updateTournament(tournament);
  
  if (enableGroups) {
    generateGroupStage(tournament);
    
    // IMPORTANT: wait for group stage → THEN knockout
    buildKnockoutBracket(tournament);
    
  } else {
    generateKnockoutStage(null, tournament, teams, knockoutSize);
  }
  
  // IMPORTANT: ensure bracket links are created AFTER matches exist
  linkKnockoutRound(tournament, "R16");
  linkKnockoutRound(tournament, "QF");
  linkKnockoutRound(tournament, "SF");
  
  updateTournament(tournament);
  
  renderFixtures();
  renderFullBracket();
  
  showActionModal("✅ Tournament Generated", "success");
}



function renderFullBracket() {
  const tournament = getCurrentTournament();
  if (!tournament) return;
  
  const el = document.getElementById("bracket");
  if (!el) return;
  
  el.innerHTML = "";
  
  const settings = tournament.settings || getTournamentSettings();
  const knockoutSize = parseInt(settings.knockoutSize);
  
  let roundsToRender = [];
  
  if (knockoutSize === 16) {
    roundsToRender = ["R16", "QF", "SF"];
  } else if (knockoutSize === 8) {
    roundsToRender = ["QF", "SF"];
  } else if (knockoutSize === 4) {
    roundsToRender = ["SF"];
  }
  
  const wrapper = document.createElement("div");
  wrapper.className = "bracket-wrapper progressive-layout";
  
  roundsToRender.forEach(stage => {
    
    const matches = tournament.matches.filter(
      m => m.type === "knockout" && m.stage === stage
    );
    
    let html = `<div class="round-column" data-round="${stage}">`;
    
    const expected = stage === "R16" ? 8 : stage === "QF" ? 4 : 2;
    
    for (let i = 0; i < expected; i++) {
      const match = matches[i];
      
      html += `
        <div class="match-box"
          onclick="openCupResultEntry('${match?.id || ''}')"
        >
          ${renderMatchInnerString(match)}
        </div>
      `;
    }
    
    html += `</div>`;
    wrapper.innerHTML += html;
  });
  
  const final = tournament.matches.find(
    m => m.type === "knockout" && m.stage === "FINAL"
  );
  
  wrapper.innerHTML += `
    <div class="round-column" data-round="final">
      <div class="final-box"
        onclick="openCupResultEntry('${final?.id || ''}')">

        <h3>FINAL</h3>

        <div class="teams">
          <span>${final?.home || "TBD"}</span>
          <span>${final?.played ? `${final.homeGoals} - ${final.awayGoals}` : "VS"}</span>
          <span>${final?.away || "TBD"}</span>
        </div>

      </div>
    </div>
  `;
  
  el.appendChild(wrapper);
}



function openCupBox() {
  document.getElementById("cupBox").style.display = "block";
  hideAllPages();
  document.getElementById("cupShedule").style.display = "none";
  document.getElementById("fullBracket").style.display = "none";
  document.getElementById("resultRecord").style.display = "none";
  
  
  document.getElementById("cupPage").style.display = "block";
}


function openBracket() {
  document.getElementById("cupBox").style.display = "none";
  hideAllPages();
  document.getElementById("cupShedule").style.display = "none";
  document.getElementById("fullBracket").style.display = "flex";
  document.getElementById("resultRecord").style.display = "none";
  
  
  document.getElementById("cupPage").style.display = "block";
  renderFullBracket
}



function renderCupTables() {
  
  const tournament = getCurrentTournament();
  if (!tournament) return;
  
  const container = document.getElementById("cupTables");
  if (!container) return;
  
  container.innerHTML = "";
  
  if (!tournament.groups?.length) {
    container.innerHTML = `
      <p class="emptyText">
        No tables available
      </p>
    `;
    return;
  }
  
  
  generateGroupTables(tournament);
  
  tournament.groups.forEach(group => {
    
    const table = tournament.groupTables?.[group.name] || [];
    
    const groupCard = document.createElement("div");
    groupCard.className = "groupCard";
    
    groupCard.innerHTML = `
      <div class="groupHeader">
        <h3>${group.name}</h3>
      </div>

      <div class="table-wrapper groupTableWrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Team</th>
              <th>P</th>
              <th>GD</th>
              <th>Pts</th>
            </tr>
          </thead>

          <tbody>
            ${
              table.length
                ? table.map((team, index) => `
                    <tr>
                      <td>${index + 1}</td>
                      <td>${team.name}</td>
                      <td>${team.p}</td>
                      <td>${team.gf - team.ga}</td>
                      <td>${team.pts}</td>
                    </tr>
                  `).join("")
                : `
                  <tr>
                    <td colspan="5" class="emptyText">
                      No table data yet
                    </td>
                  </tr>
                `
            }
          </tbody>
        </table>
      </div>
    `;
    
    container.appendChild(groupCard);
  });
}



function toggleCupView(view) {
  const fixtures = document.getElementById("cupFixtures");
  const tables = document.getElementById("cupTables");
  const roundBar = document.querySelector(".cupRoundBar");
  
  if (view === "fixtures") {
    fixtures.style.display = "block";
    tables.style.display = "none";
    roundBar.style.display = "flex";
    
    renderCupFixtures(); // important
  } else {
    fixtures.style.display = "none";
    tables.style.display = "block";
    roundBar.style.display = "none";
    
    renderCupTables();
  }

}





function renderCupFixtures() {
  
  const tournament = getCurrentTournament();
  
  if (!tournament) return;
  
  const container =
    document.getElementById("cupFixtures");
  
  container.innerHTML = "";
  
  if (!tournament.groups?.length) {
    
    container.innerHTML = `
      <p class="emptyText">
        No fixtures generated
      </p>
    `;
    
    return;
  }
  
  const currentRound =
    tournament.cupRound || 1;
  
  const roundLabel =
    document.getElementById(
      "cupRoundLabel"
    );
  
  if (roundLabel) {
    
    roundLabel.textContent =
      `Matchday ${currentRound}`;
    
  }
  
  tournament.groups.forEach(group => {
    
    const groupCard =
      document.createElement("div");
    
    groupCard.className = "groupCard";
    
    const matches =
      tournament.matches.filter(
        m =>
        m.group === group.name &&
        m.round === currentRound
      );
    
    if (!matches.length) return;
    
    groupCard.innerHTML = `

      <div class="groupHeader">

        <h3>${group.name}</h3>

      </div>

      <div class="groupMatches">

        ${matches.map(match => `

          <div class="fixture-row">

            <span class="team home-team">
              ${match.home}
            </span>

            <span class="score-badge ${
              match.played
                ? "played"
                : "not-played"
            }">

              ${
                match.played
                ? `${match.homeGoals} - ${match.awayGoals}`
                : "VS"
              }

            </span>

            <span class="team away-team">
              ${match.away}
            </span>

          </div>

        `).join("")}

      </div>

    `;
    
    container.appendChild(groupCard);
    
  });
  
}



function renderMatchInnerString(match) {
  
  if (!match) {
    return `
      <div class="match-details-box">
        <div class="team-line">TBD</div>
        <div class="score-line">VS</div>
        <div class="team-line">TBD</div>
      </div>
    `;
  }
  
  return `
    <div class="match-details-box">
      <div class="team-line"><strong>${match.home}</strong></div>
      <div class="score-line">
        ${match.played ? `${match.homeGoals} - ${match.awayGoals}` : "VS"}
      </div>
      <div class="team-line"><strong>${match.away}</strong></div>
    </div>
  `;
}



function setCupMatchResult(matchId, hg, ag) {
  
  const tournament = getCurrentTournament();
  if (!tournament) return;
  
  const match = tournament.matches.find(m => m.id === matchId);
  
  if (!match) {
    showActionModal("No fixture found", "delete");
    return;
  }
  
  if (match.played) {
    const confirmOverride = confirm("Override existing result?");
    if (!confirmOverride) return;
  }
  
  // 1. Save result only
  match.homeGoals = hg;
  match.awayGoals = ag;
  match.played = true;
  
  updateTournament(tournament);
  
  // 2. SINGLE SOURCE OF TRUTH FOR PROGRESSION
  handleCupAfterMatchUpdate(matchId);
  
  // 3. UI feedback
  showActionModal("✅ Cup Result Saved", "success");
}


function generateKnockoutStage(
  groups,
  tournament,
  qualifiedTeams = null,
  knockoutSize = 8
) {
  
  let teams = [];
  
  // STEP 1: resolve teams
  if (!groups || !groups.length) {
    if (!qualifiedTeams || qualifiedTeams.length < 2) {
      showAlert("Add at least 2 teams");
      return;
    }
    teams = [...qualifiedTeams];
  } else {
    
    const leftSide = [];
    const rightSide = [];
    
    groups.forEach((group, index) => {
      const first = group?.teams?.[0];
      const second = group?.teams?.[1];
      
      if (!first || !second) return;
      
      if (index % 2 === 0) {
        leftSide.push(first, second);
      } else {
        rightSide.push(first, second);
      }
    });
    
    teams = [...leftSide, ...rightSide];
  }
  
  // STEP 2: decide first stage only
  let stageKey = "";
  
  if (knockoutSize === 16) stageKey = "R16";
  else if (knockoutSize === 8) stageKey = "QF";
  else if (knockoutSize === 4) stageKey = "SF";
  else if (knockoutSize === 2) stageKey = "FINAL";
  
  if (!stageKey) return;
  
  // STEP 3: PREVENT DUPLICATE ONLY FOR SAME STAGE (FIXED)
  const existing = tournament.matches.filter(
    m => m.type === "knockout" && m.stage === stageKey
  );
  
  if (existing.length > 0) return;
  
  // STEP 4: build matches
  const roundMatches = [];
  
  for (let i = 0; i < teams.length; i += 2) {
    
    const home = teams[i];
    const away = teams[i + 1];
    
    if (!away) break;
    
    roundMatches.push({
      id: `${stageKey}_M${i / 2 + 1}`,
      home,
      away,
      stage: stageKey,
      type: "knockout",
      round: 1,
      played: false,
      homeGoals: null,
      awayGoals: null,
      
      nextMatchId: null,
      nextSlot: null
    });
  }
  
  // STEP 5: append ONLY this stage
  tournament.matches.push(...roundMatches);
  
  // STEP 6: safe knockout object update (DO NOT RESET EVERYTHING)
  tournament.knockout = tournament.knockout || {};
  tournament.knockout[stageKey] = roundMatches;
  
  updateTournament(tournament);
}




function generateGroupStage(tournament) {
  
  const teamsPerGroup =
    parseInt(document.getElementById("teamsPerGroup").value);
  
  let teams = [...tournament.teams];
  
  if (teams.length < teamsPerGroup) {
    showAlert("Not enough teams");
    return;
  }
  
  // shuffle
  teams = teams.sort(() => Math.random() - 0.5);
  
  const groups = [];
  const matches = [];
  
  const totalGroups = Math.ceil(teams.length / teamsPerGroup);
  let groupLetterCode = 65;
  
  for (let g = 0; g < totalGroups; g++) {
    
    let groupTeams =
      teams.slice(g * teamsPerGroup, (g + 1) * teamsPerGroup);
    
    const groupName = `Group ${String.fromCharCode(groupLetterCode)}`;
    groupLetterCode++;
    
    groups.push({
      name: groupName,
      index: g, // ✅ FIX: stable identity
      teams: [...groupTeams]
    });
    
    // BYE HANDLING (SAFE)
    if (groupTeams.length % 2 !== 0) {
      groupTeams.push("BYE");
    }
    
    const numTeams = groupTeams.length;
    const totalRounds = numTeams - 1;
    const halfSize = numTeams / 2;
    
    for (let round = 0; round < totalRounds; round++) {
      
      for (let i = 0; i < halfSize; i++) {
        
        const home = groupTeams[i];
        const away = groupTeams[numTeams - 1 - i];
        
        if (home === "BYE" || away === "BYE") continue;
        
        matches.push({
          id: `GR_${groupName}_R${round + 1}_M${i + 1}`,
          home,
          away,
          homeGoals: null,
          awayGoals: null,
          played: false,
          type: "group",
          group: groupName,
          groupIndex: g, // ✅ FIX: stable grouping
          round: round + 1
        });
      }
      
      // rotate
      groupTeams.splice(1, 0, groupTeams.pop());
    }
  }
  
  // ✅ FIX: only reset group matches, NOT knockout
  tournament.groups = groups;
  
  tournament.matches = [
    ...tournament.matches.filter(m => m.type !== "group"),
    ...matches
  ];
  
  tournament.cupRound = 1;
  
  updateTournament(tournament);
  
  renderCupFixtures();
  renderCupTables();
  
  showActionModal("✅ Group Stage Generated", "success");
}



function generateGroupTables(tournament) {
  
  tournament.groupTables = {};
  
  tournament.groups.forEach(group => {
    
    const table = {};
    
    // STEP 1: init teams safely
    group.teams.forEach(team => {
      if (!team || team === "BYE") return;
      
      table[team] = {
        name: team,
        p: 0,
        w: 0,
        d: 0,
        l: 0,
        gf: 0,
        ga: 0,
        gd: 0, // ✅ FIX: goal difference stored
        pts: 0,
        pos: 0
      };
    });
    
    // STEP 2: process matches
    const matches = tournament.matches.filter(
      m => m.type === "group" &&
      m.group === group.name &&
      m.played
    );
    
    matches.forEach(match => {
      
      const home = table[match.home];
      const away = table[match.away];
      
      if (!home || !away) return;
      
      const hg = Number(match.homeGoals) || 0;
      const ag = Number(match.awayGoals) || 0;
      
      home.p++;
      away.p++;
      
      home.gf += hg;
      home.ga += ag;
      
      away.gf += ag;
      away.ga += hg;
      
      home.gd = home.gf - home.ga;
      away.gd = away.gf - away.ga;
      
      if (hg > ag) {
        home.w++;
        home.pts += 3;
        away.l++;
      } else if (ag > hg) {
        away.w++;
        away.pts += 3;
        home.l++;
      } else {
        home.d++;
        away.d++;
        home.pts += 1;
        away.pts += 1;
      }
    });
    
    // STEP 3: sort with FULL tie-break system
    const sorted = Object.values(table).sort((a, b) => {
      
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.gd !== a.gd) return b.gd - a.gd;
      if (b.gf !== a.gf) return b.gf - a.gf;
      
      return a.name.localeCompare(b.name); // stable fallback
    });
    
    // STEP 4: assign positions (IMPORTANT FIX)
    sorted.forEach((team, index) => {
      team.pos = index + 1;
    });
    
    tournament.groupTables[group.name] = sorted;
  });
}









let currentCupMatchId = null;
function openCupResultEntry(matchId) {
  
  if (!matchId) return;
  
  const tournament = getCurrentTournament();
  const match = tournament.matches.find(m => m.id === matchId);
  
  if (!match) return;
  
  currentCupMatchId = matchId;
  
  document.getElementById("homeTeam").value = match.home;
  document.getElementById("awayTeam").value = match.away;
  
  document.getElementById("homeGoals").value = "";
  document.getElementById("awayGoals").value = "";
  
  document.activeElement?.blur();
  
  document.getElementById("resultRecord").style.display = "block";
}



function linkKnockoutRound(tournament, stageKey) {
  
  if (!tournament?.matches) return;
  
  const nextMap = {
    R16: "QF",
    QF: "SF",
    SF: "FINAL"
  };
  
  const nextStage = nextMap[stageKey];
  if (!nextStage) return;
  
  const matches = tournament.matches
    .filter(
      m =>
      m.type === "knockout" &&
      m.stage === stageKey
    )
    .sort((a, b) =>
      a.id.localeCompare(b.id)
    );
  
  const nextMatches = tournament.matches
    .filter(
      m =>
      m.type === "knockout" &&
      m.stage === nextStage
    )
    .sort((a, b) =>
      a.id.localeCompare(b.id)
    );
  
  if (!nextMatches.length) return;
  
  let j = 0;
  
  for (let i = 0; i < matches.length; i += 2) {
    
    const m1 = matches[i];
    const m2 = matches[i + 1];
    
    const target = nextMatches[j];
    
    if (!target) break;
    
    if (m1) {
      m1.nextMatchId = target.id;
      m1.nextSlot = "home";
    }
    
    if (m2) {
      m2.nextMatchId = target.id;
      m2.nextSlot = "away";
    }
    
    j++;
  }
  
  updateTournament(tournament);
}


function getQualifiedTeams(tournament) {
  
  if (!tournament?.groups?.length) return [];
  
  const perGroup =
    tournament.settings?.teamsQualify || 2;
  
  generateGroupTables(tournament);
  
  const qualified = [];
  
  tournament.groups.forEach(group => {
    
    const table =
      tournament.groupTables?.[group.name] || [];
    
    for (let i = 0; i < perGroup; i++) {
      if (table[i]) {
        qualified.push(table[i].name);
      }
    }
    
  });
  
  return qualified;
}




function handleSetScore() {
  
  const hg = parseInt(document.getElementById("homeGoals").value);
  const ag = parseInt(document.getElementById("awayGoals").value);
  
  if (isNaN(hg) || isNaN(ag)) {
    showAlert("Invalid score");
    return;
  }
  
  const matchId = currentCupMatchId;
  
  if (matchId) {
    setCupMatchResult(matchId, hg, ag);
  } else {
    // fallback = league mode
    const home = document.getElementById("homeTeam").value;
    const away = document.getElementById("awayTeam").value;
    
    setMatchResult(home, away, hg, ag);
  }
  
  document.getElementById("homeGoals").value = "";
  document.getElementById("awayGoals").value = "";
}


function resetCupMatchResult(matchId) {
  
  const tournament = getCurrentTournament();
  if (!tournament) return;
  
  const match = tournament.matches.find(m => m.id === matchId);
  
  if (!match) return;
  
  match.homeGoals = null;
  match.awayGoals = null;
  match.played = false;
  
  updateTournament(tournament);
  
  renderCupFixtures();
  renderFullBracket();
  renderCupTables();
  
  handleCupAfterMatchUpdate(matchId);
  
  showActionModal("↺ Cup Reset Done", "delete");
}



function handleCupAfterMatchUpdate(matchId) {
  
  const tournament = getCurrentTournament();
  
  if (!tournament) return;
  
  const match = tournament.matches.find(
    m => m.id === matchId
  );
  
  if (!match) return;
  
  // GROUP STAGE
  if (match.type === "group") {
    
    generateGroupTables(tournament);
    
    const allGroupMatchesPlayed =
      tournament.matches
      .filter(m => m.type === "group")
      .every(m => m.played);
    
    if (allGroupMatchesPlayed) {
      
      buildKnockoutBracket(tournament);
      
      // CREATE EMPTY NEXT ROUNDS
      createEmptyKnockoutRounds(tournament);
      
      // LINK EVERYTHING
      linkKnockoutRound(tournament, "R16");
      linkKnockoutRound(tournament, "QF");
      linkKnockoutRound(tournament, "SF");
    }
  }
  
  // KNOCKOUT STAGE
  if (match.type === "knockout") {
    
    if (match.homeGoals === match.awayGoals) {
      showAlert("Knockout matches cannot end in a draw");
      return;
    }
    
    const winner =
      match.homeGoals > match.awayGoals ?
      match.home :
      match.away;
    
    // MOVE WINNER
    if (match.nextMatchId && match.nextSlot) {
      
      const nextMatch = tournament.matches.find(
        m => m.id === match.nextMatchId
      );
      
      if (nextMatch) {
        
        nextMatch[match.nextSlot] = winner;
      }
    }
  }
  
  updateTournament(tournament);
  
  renderCupFixtures();
  renderCupTables();
  renderFullBracket();
}



function createEmptyKnockoutRounds(tournament) {
  
  const stages = ["QF", "SF", "FINAL"];
  
  const stageMatchCount = {
    QF: 4,
    SF: 2,
    FINAL: 1
  };
  
  stages.forEach(stage => {
    
    const existing = tournament.matches.filter(
      m =>
      m.type === "knockout" &&
      m.stage === stage
    );
    
    if (existing.length > 0) return;
    
    const matches = [];
    
    for (let i = 0; i < stageMatchCount[stage]; i++) {
      
      matches.push({
        id: `${stage}_M${i + 1}`,
        home: "TBD",
        away: "TBD",
        stage,
        type: "knockout",
        round: 1,
        played: false,
        homeGoals: null,
        awayGoals: null,
        nextMatchId: null,
        nextSlot: null
      });
    }
    
    tournament.matches.push(...matches);
    
    tournament.knockout =
      tournament.knockout || {};
    
    tournament.knockout[stage] = matches;
  });
}




function buildKnockoutBracket(tournament) {

  const settings =
    tournament.settings ||
    getTournamentSettings();

  const size =
    parseInt(settings.knockoutSize);

  const qualifyPerGroup =
    settings.teamsQualify || 2;

  let stageKey = "";

  if (size === 16) stageKey = "R16";
  else if (size === 8) stageKey = "QF";
  else if (size === 4) stageKey = "SF";
  else if (size === 2) stageKey = "FINAL";

  if (!stageKey) return;

  const existing =
    tournament.matches.filter(
      m =>
        m.type === "knockout" &&
        m.stage === stageKey
    );

  if (existing.length > 0) return;

  generateGroupTables(tournament);

  let groupsQualified = [];

  if (tournament.groups?.length) {

    tournament.groups.forEach(group => {

      const table =
        tournament.groupTables?.[group.name] || [];

      const groupMatches =
        tournament.matches.filter(
          m =>
            m.type === "group" &&
            m.group === group.name
        );

      // ✅ REAL completion check
      const isGroupFinished =
        groupMatches.length > 0 &&
        groupMatches.every(m => m.played);

      for (let i = 0; i < qualifyPerGroup; i++) {

        const position = i + 1;

        const label =
          position === 1
            ? "Winner"
            : "Runner-up";

        if (
          isGroupFinished &&
          table[i]?.name
        ) {

          groupsQualified.push({
            name: table[i].name,
            group: group.name,
            position,
            pts: table[i].pts || 0,
            isPlaceholder: false
          });

        } else {

          groupsQualified.push({
            name: `${label} ${group.name}`,
            group: group.name,
            position,
            pts: 0,
            isPlaceholder: true
          });
        }
      }
    });

  } else {

    groupsQualified =
      tournament.teams.map(team => ({
        name: team,
        group: null,
        position: null,
        pts: 0,
        isPlaceholder: false
      }));
  }

  const finalPairs = [];

  const winners =
    groupsQualified.filter(
      t => t.position === 1
    );

  const runnersUp =
    groupsQualified.filter(
      t => t.position === 2
    );

  if (
    winners.length > 0 &&
    runnersUp.length > 0
  ) {

    const hasPlaceholders =
      groupsQualified.some(
        t => t.isPlaceholder
      );

    if (!hasPlaceholders) {

      winners.sort(
        (a, b) => b.pts - a.pts
      );

      runnersUp.sort(
        (a, b) => b.pts - a.pts
      );

    } else {

      winners.sort(
        (a, b) =>
          a.group.localeCompare(b.group)
      );

      runnersUp.sort(
        (a, b) =>
          a.group.localeCompare(b.group)
      );
    }

    while (winners.length > 0) {

      const home = winners.shift();

      let awayIndex = -1;

      for (
        let i = runnersUp.length - 1;
        i >= 0;
        i--
      ) {

        if (
          runnersUp[i].group !==
          home.group
        ) {

          awayIndex = i;
          break;
        }
      }

      if (awayIndex === -1) {
        awayIndex = runnersUp.length - 1;
      }

      const away =
        runnersUp.splice(awayIndex, 1)[0];

      finalPairs.push({
        home,
        away
      });
    }

  } else {

    groupsQualified.sort(
      (a, b) => b.pts - a.pts
    );

    const seeded = [...groupsQualified];

    while (seeded.length > 1) {

      const home = seeded.shift();

      const away = seeded.pop();

      finalPairs.push({
        home,
        away
      });
    }
  }

  const matches = [];

  finalPairs.forEach((pair, i) => {

    matches.push({
      id: `${stageKey}_M${i + 1}`,

      home: pair.home.name,
      away: pair.away.name,

      stage: stageKey,
      type: "knockout",

      round: 1,

      played: false,

      homeGoals: null,
      awayGoals: null,

      nextMatchId: null,
      nextSlot: null
    });
  });

  tournament.matches.push(...matches);

  tournament.knockout =
    tournament.knockout || {};

  tournament.knockout[stageKey] =
    matches;

  updateTournament(tournament);

  linkKnockoutRound(
    tournament,
    stageKey
  );

  
  

}


function buildKnockoutBracket(tournament) {

  if (!tournament) return;

  const settings =
    tournament.settings ||
    getTournamentSettings();

  const size =
    parseInt(settings.knockoutSize);

  let stageKey = "";

  if (size === 16) stageKey = "R16";
  else if (size === 8) stageKey = "QF";
  else if (size === 4) stageKey = "SF";
  else if (size === 2) stageKey = "FINAL";

  if (!stageKey) {
    console.log("No valid stageKey");
    return;
  }

  const existing =
    tournament.matches.filter(
      m =>
        m.type === "knockout" &&
        m.stage === stageKey
    );

  if (existing.length > 0) {
    console.log("Knockout already exists:", stageKey);
    return;
  }

  if (!tournament.groups?.length) {
    console.log("No groups found");
    return;
  }

  const allGroupMatches =
    tournament.matches.filter(
      m => m.type === "group"
    );

  const allPlayed =
    allGroupMatches.length > 0 &&
    allGroupMatches.every(
      m => m.played === true
    );

  if (!allPlayed) {
    console.log("Groups not completed yet");
    return;
  }

  generateGroupTables(tournament);

  const qualified =
    getQualifiedTeams(tournament);

  if (!qualified.length) {
    console.log("No qualified teams");
    return;
  }

  const grouped = {};

  qualified.forEach(team => {

    if (!grouped[team.group]) {
      grouped[team.group] = [];
    }

    grouped[team.group].push(team);
  });

  const winners = [];
  const runners = [];

  Object.values(grouped).forEach(group => {

    group.sort(
      (a, b) => a.position - b.position
    );

    if (group[0]) winners.push(group[0]);
    if (group[1]) runners.push(group[1]);
  });

  winners.sort((a, b) => b.pts - a.pts);
  runners.sort((a, b) => b.pts - a.pts);

  const matches = [];

  let matchNo = 1;

  while (winners.length > 0) {

    const home = winners.shift();

    let awayIndex =
      runners.findIndex(
        r => r.group !== home.group
      );

    if (awayIndex === -1) {
      awayIndex = 0;
    }

    const away =
      runners.splice(awayIndex, 1)[0];

    if (!away) break;

    matches.push({

      id:
        `${stageKey}_M${matchNo++}`,

      home:
        home.name,

      away:
        away.name,

      stage:
        stageKey,

      type:
        "knockout",

      round: 1,

      played: false,

      homeGoals: null,

      awayGoals: null
    });
  }

  if (!matches.length) {
    console.log("No matches generated");
    return;
  }

  tournament.matches.push(
    ...matches
  );

  tournament.knockout =
    tournament.knockout || {};

  tournament.knockout[
    stageKey
  ] = matches;

  updateTournament(tournament);

  console.log(
    "Knockout created:",
    stageKey,
    matches
  );
}



function getQualifiedTeams(tournament) {
  if (!tournament || !tournament.settings) return [];

  const teamsQualify = parseInt(tournament.settings.teamsQualify) || 2;
  generateGroupTables(tournament);

  if (!tournament.groupTables) return [];

  const qualifiedTeams = [];
  const sortedGroupNames = Object.keys(tournament.groupTables).sort();

  sortedGroupNames.forEach(groupName => {
    const table = tournament.groupTables[groupName];
    const qualifiersFromGroup = table.slice(0, teamsQualify);
    
    qualifiersFromGroup.forEach(team => {
      qualifiedTeams.push({
        name: team.name,
        group: groupName,
        pos: team.pos
      });
    });
  });

  return qualifiedTeams;
}













function openSetBracketScore(matchId, round, slot) {
  const tournament = getCurrentTournament();
  if (!tournament) return;
  
  if (!tournament.knockoutMatches) {
    tournament.knockoutMatches = [];
  }
  
  let match = tournament.knockoutMatches.find(
    m => Number(m.round) === Number(round) && Number(m.slot) === Number(slot)
  );
  
  // Create match if it doesn't exist
  if (!match) {
    match = {
      id: matchId,
      round,
      slot,
      home: null,
      away: null,
      homeScore: "",
      awayScore: "",
      played: false
    };
    
    // Fill teams from previous rounds
    if (round === 1) {
      // Use tournament-specific key
      const key = `bracketPairings_${tournament.id}`;
      const pairings = JSON.parse(localStorage.getItem(key) || "[]");
      
      if (pairings[slot]) {
        match.home = pairings[slot].home;
        match.away = pairings[slot].away;
      }
    } else {
      // Get winners from previous round
      const prevRound = round - 1;
      const prevSlot1 = slot * 2;
      const prevSlot2 = slot * 2 + 1;
      
      const match1 = tournament.knockoutMatches.find(
        m => Number(m.round) === prevRound && Number(m.slot) === prevSlot1
      );
      const match2 = tournament.knockoutMatches.find(
        m => Number(m.round) === prevRound && Number(m.slot) === prevSlot2
      );
      
      if (match1?.played) {
        match.home = Number(match1.homeScore) > Number(match1.awayScore) ? match1.home : match1.away;
      }
      if (match2?.played) {
        match.away = Number(match2.homeScore) > Number(match2.awayScore) ? match2.home : match2.away;
      }
    }
    
    tournament.knockoutMatches.push(match);
    updateTournament(tournament);
  }
  
  const modal = document.getElementById("knockoutResultModal");
  const homeEl = document.getElementById("knockoutHomeTeam");
  const awayEl = document.getElementById("knockoutAwayTeam");
  const homeScoreEl = document.getElementById("knockoutHomeScore");
  const awayScoreEl = document.getElementById("knockoutAwayScore");
  
  if (!modal) return;
  
  const getName = (team) => {
    if (!team) return "Awaiting Winner";
    return typeof team === "object" ? (team.name || "Awaiting Winner") : team;
  };
  
  homeEl.textContent = getName(match.home);
  awayEl.textContent = getName(match.away);
  
  homeScoreEl.value = match.homeScore ?? "";
  awayScoreEl.value = match.awayScore ?? "";
  
  modal.dataset.matchId = matchId;
  modal.dataset.round = round;
  modal.dataset.slot = slot;
  
  modal.classList.add("active");
  window.activeBracketInput = homeScoreEl;
}


function bracketPadPress(value) {
  if (!window.activeBracketInput) return;
  
  const current = window.activeBracketInput.value || "";
  
  if (value === "clear") {
    window.activeBracketInput.value = "";
    return;
  }
  
  if (current.length >= 2) return;
  
  window.activeBracketInput.value += value;
}


function closeKnockoutResultModal() {
  const modal = document.getElementById("knockoutResultModal");
  
  if (!modal) return;
  
  modal.classList.remove("active");
}

function saveBracketResults() {
  const tournament = getCurrentTournament();
  if (!tournament) return;
  
  const modal = document.getElementById("knockoutResultModal");
  
  const round = Number(modal.dataset.round);
  const slot = Number(modal.dataset.slot);
  
  const homeScore = Number(
    document.getElementById("knockoutHomeScore").value
  );
  
  const awayScore = Number(
    document.getElementById("knockoutAwayScore").value
  );
  
  if (isNaN(homeScore) || isNaN(awayScore)) {
    showAlert("Enter valid scores");
    return;
  }
  
  if (homeScore === awayScore) {
    showAlert("Knockout matches cannot end in a draw");
    return;
  }
  
  const match = tournament.knockoutMatches.find(
    m => Number(m.round) === round &&
    Number(m.slot) === slot
  );
  
  if (!match) return;
  
  match.homeScore = homeScore;
  match.awayScore = awayScore;
  match.played = true;
  
  const winner =
    homeScore > awayScore ?
    match.home :
    match.away;
  
  const nextRound = round + 1;
  const nextSlot = Math.floor(slot / 2);
  
  
  const totalRounds = Math.log2(
    tournament.settings.knockoutSize
  );
  
  if (round < totalRounds) {
    let nextMatch = tournament.knockoutMatches.find(
      m => Number(m.round) === nextRound &&
      Number(m.slot) === nextSlot
    );
    
    if (!nextMatch) {
      nextMatch = {
        id: `R${nextRound}S${nextSlot}`,
        round: nextRound,
        slot: nextSlot,
        home: null,
        away: null,
        homeScore: "",
        awayScore: "",
        played: false
      };
      
      tournament.knockoutMatches.push(nextMatch);
    }
    
    
    if (slot % 2 === 0) {
      nextMatch.home = winner;
    } else {
      nextMatch.away = winner;
    }
  }
  
  updateTournament(tournament);

renderFullBracket();

closeKnockoutResultModal();
  
  showAlert("Knockout result saved");
}



function setBracketInput(target) {
  window.activeBracketInput = target;
}









