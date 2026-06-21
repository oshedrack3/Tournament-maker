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




function generateKnockoutStage(
  groups,
  tournament,
  qualifiedTeams = null,
  knockoutSize = 8
) {
  
  let teams = [];
  
 
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
      
      if (!group || !Array.isArray(group.teams)) return;
      
      const first = group.teams[0];
      const second = group.teams[1];
      
      if (!first || !second) return;
      
      if (index % 2 === 0) {
        leftSide.push(first, second);
      } else {
        rightSide.push(first, second);
      }
      
    });
    
    teams = [...leftSide, ...rightSide];
  }
  
 
  let stageKey = "";
  
  if (knockoutSize === 16) {
    stageKey = "r16";
  } else if (knockoutSize === 8) {
    stageKey = "qf";
  } else if (knockoutSize === 4) {
    stageKey = "sf";
  } else if (knockoutSize === 2) {
    stageKey = "final";
  }
  
  const roundMatches = [];
  
  
  for (let i = 0; i < teams.length; i += 2) {
    
    const home = teams[i];
    const away = teams[i + 1];
    
    if (!away) break;
    
    roundMatches.push({
      id: `${stageKey.toUpperCase()}_M${i / 2 + 1}`,
      
      home,
      
      away,
      
      type: "knockout",
      
      stage: stageKey.toUpperCase(),
      
      round: 1,
      
      played: false,
      
      homeGoals: null,
      
      awayGoals: null
    });
  }
  
  
  tournament.matches = tournament.matches.filter(
    m => m.type !== "knockout"
  );
  
  
  tournament.matches.push(...roundMatches);
  
 
  tournament.knockout = {
    r16: [],
    qf: [],
    sf: [],
    final: null
  };
  
  
  if (stageKey === "final") {
    
    tournament.knockout.final =
      roundMatches[0] || null;
    
  } else {
    
    tournament.knockout[stageKey] =
      roundMatches;
  }
  
  updateTournament(tournament);
}



function buildKnockoutBracket(tournament) {
  
  const settings =
    tournament.settings ||
    getTournamentSettings();
  
  const size =
    settings.knockoutSize;
  
  const qualifyPerGroup =
    settings.teamsQualify || 2;
  
  let stageKey = "";
  
  if (size === 16) {
    stageKey = "r16";
  } else if (size === 8) {
    stageKey = "qf";
  } else if (size === 4) {
    stageKey = "sf";
  } else if (size === 2) {
    stageKey = "final";
  }
  
  if (!stageKey) return;
  
  tournament.knockout = {
    r16: [],
    qf: [],
    sf: [],
    final: null
  };
  
  tournament.matches =
    tournament.matches.filter(
      match => match.type !== "knockout"
    );
  
  let qualified = [];
  
  if (tournament.groups?.length) {
    
    generateGroupTables(tournament);
    
    tournament.groups.forEach(group => {
      
      const table =
        tournament.groupTables?.[group.name] || [];
      
      for (
        let i = 0;
        i < qualifyPerGroup;
        i++
      ) {
        
        const team =
          table[i]?.name || "TBD";
        
        qualified.push({
          name: team,
          group: group.name,
          position: i + 1
        });
      }
    });
    
  } else {
    
    qualified =
      tournament.teams.map(team => ({
        name: team,
        group: null,
        position: null
      }));
  }
  
  const newStageMatches = [];
  
  const used = new Set();
  
  while (
    qualified.length > 1
  ) {
    
    const home =
      qualified.shift();
    
    if (!home) break;
    
    let awayIndex =
      qualified.findIndex(
        team =>
          team.group !== home.group
      );
    
    if (awayIndex === -1) {
      awayIndex = 0;
    }
    
    const away =
      qualified.splice(
        awayIndex,
        1
      )[0];
    
    if (!away) break;
    
    const matchNumber =
      newStageMatches.length + 1;
    
    const match = {
      
      id:
        `${stageKey.toUpperCase()}_M${matchNumber}`,
      
      home:
        home.name || "TBD",
      
      away:
        away.name || "TBD",
      
      stage:
        stageKey.toUpperCase(),
      
      round: 1,
      
      type: "knockout",
      
      played: false,
      
      homeGoals: null,
      
      awayGoals: null
    };
    
    newStageMatches.push(match);
    
    used.add(home.name);
    used.add(away.name);
  }
  
  if (stageKey === "final") {
    
    tournament.knockout.final =
      newStageMatches[0] || null;
    
  } else {
    
    tournament.knockout[stageKey] =
      newStageMatches;
  }
  
  tournament.matches.push(
    ...newStageMatches
  );
  
  updateTournament(tournament);
}



function renderFullBracket() {

  const tournament = getCurrentTournament();
  if (!tournament) return;

  const el = document.getElementById("bracket");
  if (!el) return;

  el.innerHTML = "";

  const knockout = tournament.knockout || {};

  const r16 = knockout.r16 || [];
  const qf = knockout.qf || [];
  const sf = knockout.sf || [];

  const wrapper = document.createElement("div");
  wrapper.className = "bracket-wrapper progressive-layout";

  
  let roundsToRender = [];

  if (r16.length > 0) {

    roundsToRender = [
      {
        key: "r16",
        matches: r16,
        expected: 8
      },
      {
        key: "qf",
        matches: qf,
        expected: 4
      },
      {
        key: "sf",
        matches: sf,
        expected: 2
      }
    ];

  } else if (qf.length > 0) {

    roundsToRender = [
      {
        key: "qf",
        matches: qf,
        expected: 4
      },
      {
        key: "sf",
        matches: sf,
        expected: 2
      }
    ];

  } else if (sf.length > 0) {

    roundsToRender = [
      {
        key: "sf",
        matches: sf,
        expected: 2
      }
    ];
  }

  
  roundsToRender.forEach(round => {

    let html = `
      <div class="round-column" data-round="${round.key}">
    `;

    for (let i = 0; i < round.expected; i++) {

      html += `
        <div class="match-box">
          ${renderMatchInnerString(round.matches[i])}
        </div>
      `;
    }

    html += `</div>`;

    wrapper.innerHTML += html;
  });

  // FINAL
  const final = knockout.final;

  const finalScoreString =
    final && final.played
      ? `${final.homeGoals} - ${final.awayGoals}`
      : "VS";

  wrapper.innerHTML += `
    <div class="round-column" data-round="final">

      <div class="final-box">

        <h3>FINAL</h3>

        <div class="teams">

          <span class="team-name">
            ${final ? final.home : "TBD"}
          </span>

          <span class="score-badge">
            ${finalScoreString}
          </span>

          <span class="team-name">
            ${final ? final.away : "TBD"}
          </span>

        </div>

      </div>

    </div>
  `;

  el.appendChild(wrapper);
}

function renderMatchInnerString(match) {
  if (!match) {
    return `
      <div class="match-details-box">
        <div class="team-line" style="color: #6e7681;">TBD</div>
        <div class="score-line"><small>VS</small></div>
        <div class="team-line" style="color: #6e7681;">TBD</div>
      </div>
    `;
  }
  const scoreDisplay = match.played ? `${match.homeGoals} - ${match.awayGoals}` : "VS";
  return `
    <div class="match-details-box">
      <div class="team-line"><strong>${match.home || "TBD"}</strong></div>
      <div class="score-line"><small>${scoreDisplay}</small></div>
      <div class="team-line"><strong>${match.away || "TBD"}</strong></div>
    </div>
  `;
}




function getRoundName(size) {
  if (size === 16) return "Round of 16";
  if (size === 8) return "Quarterfinals";
  if (size === 4) return "Semifinals";
  if (size === 2) return "Finals";
  return `${size}-team bracket`;
}



function generateTournament() {

  const tournament =
    getCurrentTournament();

  if (!tournament) return;

  const teams =
    [...tournament.teams];

  if (teams.length < 2) {

    showAlert(
      "❌ Add at least 2 teams"
    );

    return;
  }

  const enableGroups =
    document.getElementById(
      "enableGroups"
    ).checked;

  const teamsPerGroup =
    parseInt(
      document.getElementById(
        "teamsPerGroup"
      ).value
    ) || 4;

  const teamsQualify =
    parseInt(
      document.getElementById(
        "teamsQualify"
      ).value
    ) || 2;

  const knockoutSize =
    parseInt(
      document.getElementById(
        "knockoutRound"
      ).value
    );

  // SAVE SETTINGS
  tournament.settings = {

    enableGroups,

    teamsPerGroup,

    teamsQualify,

    knockoutSize
  };

  if (enableGroups) {

    const totalGroups =
      Math.ceil(
        teams.length /
        teamsPerGroup
      );

    const totalQualifiers =
      totalGroups *
      teamsQualify;

    if (
      totalQualifiers !==
      knockoutSize
    ) {

      showAlert(
        `⚠️ Bracket Imbalance!\n\nYour group setup yields ${totalQualifiers} qualifying teams, but your bracket size requires exactly ${knockoutSize}.\n\nAdjust your group sizes or qualified slots.`
      );

      return;
    }

  } else {

    if (
      teams.length !==
      knockoutSize
    ) {

      showAlert(
        `⚠️ Team Count Mismatch!\n\nYou selected a ${knockoutSize}-team bracket (${getRoundName(knockoutSize)}), but you currently have ${teams.length} registered teams.\n\nEnsure they match perfectly.`
      );

      return;
    }
  }

  tournament.matches = [];

  tournament.groups = [];

  tournament.knockout = null;

  if (enableGroups) {

    generateGroupStage(
      tournament
    );

  } else {

    generateKnockoutStage(
      null,
      tournament,
      teams,
      knockoutSize
    );
  }

  updateTournament(
    tournament
  );

  renderFixtures();

  showActionModal(
    "✅ Tournament Generated",
    "success"
  );
}




function generateGroupTables(tournament) {
  tournament.groupTables = {};

  tournament.groups.forEach(group => {
    const table = {};

    group.teams.forEach(team => {
      if (team === "BYE") return; // Structural Skip Guard
      table[team] = {
        name: team, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0
      };
    });

    const matches = tournament.matches.filter(
      m => m.type === "group" && m.group === group.name && m.played
    );

    matches.forEach(match => {
      const home = table[match.home];
      const away = table[match.away];

      if (!home || !away) return;

      const hg = parseInt(match.homeGoals) || 0;
      const ag = parseInt(match.awayGoals) || 0;

      home.p++; away.p++;
      home.gf += hg; home.ga += ag;
      away.gf += ag; away.ga += hg;

      if (hg > ag) {
        home.w++; away.l++; home.pts += 3;
      } else if (ag > hg) {
        away.w++; home.l++; away.pts += 3;
      } else {
        home.d++; away.d++;
        home.pts++; away.pts++;
      }
    });

    tournament.groupTables[group.name] = Object.values(table).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      return (b.gf - b.ga) - (a.gf - a.ga);
    });
  });
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


function nextCupRound() {
  
  const tournament =
    getCurrentTournament();
  
  if (!tournament) return;
  
  const maxRound = Math.max(
    ...tournament.matches.map(
      m => m.round || 1
    )
  );
  
  tournament.cupRound =
    (tournament.cupRound || 1) + 1;
  
  if (
    tournament.cupRound > maxRound
  ) {
    tournament.cupRound =
      maxRound;
  }
  
  updateTournament(tournament);
  
  renderCupFixtures();
  
}


function prevCupRound() {
  
  const tournament =
    getCurrentTournament();
  
  if (!tournament) return;
  
  tournament.cupRound =
    (tournament.cupRound || 1) - 1;
  
  if (tournament.cupRound < 1) {
    tournament.cupRound = 1;
  }
  
  updateTournament(tournament);
  
  renderCupFixtures();
  
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



function generateGroupStage(tournament) {
  const teamsPerGroup = parseInt(document.getElementById("teamsPerGroup").value);
  let teams = [...tournament.teams];

  if (teams.length < teamsPerGroup) {
    showAlert("Not enough teams");
    return;
  }

  
  teams = teams.sort(() => Math.random() - 0.5);

  const groups = [];
  const matches = [];
  const totalGroups = Math.ceil(teams.length / teamsPerGroup);
  let groupLetterCode = 65;

  for (let g = 0; g < totalGroups; g++) {
    let groupTeams = teams.slice(g * teamsPerGroup, (g + 1) * teamsPerGroup);
    const groupName = `Group ${String.fromCharCode(groupLetterCode)}`;
    groupLetterCode++;

    groups.push({
      name: groupName,
      teams: [...groupTeams]
    });

    const hasBye = groupTeams.length % 2 !== 0;
    if (hasBye) {
      groupTeams.push("BYE");
    }

    const numTeams = groupTeams.length;
    const totalRounds = numTeams - 1;
    const halfSize = numTeams / 2;

    for (let round = 0; round < totalRounds; round++) {
      for (let i = 0; i < halfSize; i++) {
        const home = groupTeams[i];
        const away = groupTeams[numTeams - 1 - i];

        if (home !== "BYE" && away !== "BYE") {
          matches.push({
            id: `GR_${groupName}_R${round + 1}_M${i + 1}`, 
            home,
            away,
            homeGoals: null,
            awayGoals: null,
            played: false,
            type: "group",
            group: groupName,
            round: round + 1
          });
        }
      }
      groupTeams.splice(1, 0, groupTeams.pop());
    }
  }

  tournament.groups = groups;
  tournament.matches = matches;
  tournament.cupRound = 1; 

  updateTournament(tournament);
  renderCupFixtures();
  showActionModal("✅ Group Stage Generated", "success");
}


let bracketZoom = 1;

let initialDistance = 0;


function applyBracketZoom() {
  
  const bracket =
    document.getElementById("bracket");
  
  if (!bracket) return;
  
  bracket.style.transform =
    `scale(${bracketZoom})`;
  
  bracket.style.transformOrigin =
    "top left";
}


function zoomInBracket() {
  
  bracketZoom += 0.1;
  
  if (bracketZoom > 2) {
    bracketZoom = 2;
  }
  
  applyBracketZoom();
}


function zoomOutBracket() {
  
  bracketZoom -= 0.1;
  
  if (bracketZoom < 0.5) {
    bracketZoom = 0.5;
  }
  
  applyBracketZoom();
}


function resetBracketZoom() {
  
  bracketZoom = 1;
  
  applyBracketZoom();
}


const viewport =
  document.getElementById("bracketViewport");


viewport.addEventListener("touchmove", e => {
  
  if (e.touches.length !== 2) return;
  
  e.preventDefault();
  
  const dx =
    e.touches[0].clientX -
    e.touches[1].clientX;
  
  const dy =
    e.touches[0].clientY -
    e.touches[1].clientY;
  
  const distance =
    Math.sqrt(dx * dx + dy * dy);
  
  if (!initialDistance) {
    
    initialDistance = distance;
    
    return;
  }
  
  const scaleChange =
    distance / initialDistance;
  
  bracketZoom *= scaleChange;
  
  if (bracketZoom < 0.5) {
    bracketZoom = 0.5;
  }
  
  if (bracketZoom > 2) {
    bracketZoom = 2;
  }
  
  applyBracketZoom();
  
  initialDistance = distance;
  
}, { passive: false });


viewport.addEventListener("touchend", () => {
  
  initialDistance = 0;
  
});







function handleCupMatchUpdate(matchId, homeGoals, awayGoals) {
  
  const tournament = getCurrentTournament();
  if (!tournament) return;
  
  const match = tournament.matches.find(m => m.id === matchId);
  if (!match || match.type !== "knockout") return;
  
  match.homeGoals = homeGoals;
  match.awayGoals = awayGoals;
  match.played = true;
  
  updateTournament(tournament);
  
  renderFullBracket();
}



function buildKnockoutBracket(tournament) {
  
  const settings = tournament.settings;
  if (!settings) return;
  
  const size = settings.knockoutSize;
  
  let stageKey =
    size === 16 ? "r16" :
    size === 8 ? "qf" :
    size === 4 ? "sf" :
    size === 2 ? "final" :
    null;
  
  if (!stageKey) return;
  
  const qualified = getQualifiedTeams(tournament);
  
  if (qualified.length < 2) return;
  
  tournament.knockout = {
    r16: [],
    qf: [],
    sf: [],
    final: null
  };
  
  tournament.matches =
    tournament.matches.filter(m => m.type !== "knockout");
  
  const matches = [];
  
  for (let i = 0; i < qualified.length; i += 2) {
    
    if (!qualified[i + 1]) break;
    
    matches.push({
      id: `${stageKey.toUpperCase()}_M${i / 2 + 1}`,
      home: qualified[i],
      away: qualified[i + 1],
      type: "knockout",
      stage: stageKey.toUpperCase(),
      round: 1,
      played: false,
      homeGoals: null,
      awayGoals: null
    });
  }
  
  tournament.knockout[stageKey] = matches;
  
  tournament.matches.push(...matches);
  
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
    roundsToRender = [
      { key: "r16", expected: 8 },
      { key: "qf", expected: 4 },
      { key: "sf", expected: 2 }
    ];
  } else if (knockoutSize === 8) {
    roundsToRender = [
      { key: "qf", expected: 4 },
      { key: "sf", expected: 2 }
    ];
  } else if (knockoutSize === 4) {
    roundsToRender = [
      { key: "sf", expected: 2 }
    ];
  }
  
  const wrapper = document.createElement("div");
  wrapper.className = "bracket-wrapper progressive-layout";
  
  roundsToRender.forEach(round => {
    
    const matches = tournament.knockout?.[round.key] || [];
    
    let html = `<div class="round-column" data-round="${round.key}">`;
    
    for (let i = 0; i < round.expected; i++) {
      
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
  
  const final = tournament.knockout?.final;
  
  wrapper.innerHTML += `
    <div class="round-column" data-round="final">

      <div class="final-box"
        onclick="openCupResultEntry('${final?.id || ''}')"
      >

        <h3>FINAL</h3>

        <div class="teams">

          <span class="team-name">${final?.home || "TBD"}</span>

          <span class="score-badge">
            ${final?.played ? `${final.homeGoals} - ${final.awayGoals}` : "VS"}
          </span>

          <span class="team-name">${final?.away || "TBD"}</span>

        </div>

      </div>

    </div>
  `;
  
  el.appendChild(wrapper);
}


function handleSetScore() {
  
  const hg = parseInt(document.getElementById("homeGoals").value);
  const ag = parseInt(document.getElementById("awayGoals").value);
  
  if (isNaN(hg) || isNaN(ag)) {
    showAlert("Invalid score");
    return;
  }
  
  const tournament = getCurrentTournament();
  if (!tournament) return;
  
  const match = tournament.matches.find(m => m.id === currentCupMatchId);
  
  if (!match) {
    showAlert("Match not found");
    return;
  }
  
  match.homeGoals = hg;
  match.awayGoals = ag;
  match.played = true;
  
  updateTournament(tournament);
  
  rebuildTableFromMatches();
  
  renderCupFixtures();
  renderFullBracket();
  renderCupTables();
  
  handleCupAfterMatchUpdate(match.id);
  
  closeResultRecord();
  
  currentCupMatchId = null;
  
  showActionModal("✅ Result Saved", "success");
}

function handleResetMatch() {
  
  const tournament = getCurrentTournament();
  if (!tournament) return;
  
  const match = tournament.matches.find(m => m.id === currentCupMatchId);
  
  if (!match) return;
  
  match.homeGoals = null;
  match.awayGoals = null;
  match.played = false;
  
  updateTournament(tournament);
  
  renderCupFixtures();
  renderFullBracket();
  renderCupTables();
  
  closeResultRecord();
  
  currentCupMatchId = null;
  
  showActionModal("↺ Reset Done", "delete");
}

function closeResultRecord() {
  document.getElementById("resultRecord").style.display = "none";
  currentCupMatchId = null;
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
  
  match.homeGoals = hg;
  match.awayGoals = ag;
  match.played = true;
  
  updateTournament(tournament);
  updateKnockoutProgression(match);
  rebuildTableFromMatches();
  
  renderCupFixtures();
  renderFullBracket();
  renderCupTables();
  
  handleCupAfterMatchUpdate(matchId);
  
  showActionModal("✅ Cup Result Saved", "success");
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



function buildKnockoutBracket(tournament) {
  
  const settings =
    tournament.settings ||
    getTournamentSettings();
  
  const size = parseInt(settings.knockoutSize);
  const qualifyPerGroup = settings.teamsQualify || 2;
  
  let stageKey = "";
  
  if (size === 16) stageKey = "R16";
  else if (size === 8) stageKey = "QF";
  else if (size === 4) stageKey = "SF";
  else if (size === 2) stageKey = "FINAL";
  
  if (!stageKey) return;
  
  let qualified = [];
  
  if (tournament.groups?.length) {
    
    generateGroupTables(tournament);
    
    tournament.groups.forEach(group => {
      
      const table =
        tournament.groupTables?.[group.name] || [];
      
      for (let i = 0; i < qualifyPerGroup; i++) {
        
        const team = table[i]?.name;
        
        if (team) {
          qualified.push({
            name: team,
            group: group.name,
            position: i + 1
          });
        }
      }
    });
    
  } else {
    
    qualified = tournament.teams.map(team => ({
      name: team,
      group: null,
      position: null
    }));
  }
  
  const existing = tournament.matches.filter(
    m => m.type === "knockout" && m.stage === stageKey
  );
  
  if (existing.length > 0) return;
  
  const newMatches = [];
  
  let matchNumber = 1;
  
  while (qualified.length > 1) {
    
    const home = qualified.shift();
    
    let awayIndex =
      qualified.findIndex(t => t.group !== home.group);
    
    if (awayIndex === -1) awayIndex = 0;
    
    const away = qualified.splice(awayIndex, 1)[0];
    
    if (!away) break;
    
    newMatches.push({
      id: `${stageKey}_M${matchNumber++}`,
      home: home.name,
      away: away.name,
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
  
  tournament.matches.push(...newMatches);
  
  tournament.knockout = tournament.knockout || {};
  tournament.knockout[stageKey] = newMatches;
  
  updateTournament(tournament);
}


function generateKnockoutStage(
  groups,
  tournament,
  qualifiedTeams = null,
  knockoutSize = 8
) {
  
  let teams = [];
  
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
  
  let stageKey = "";
  
  if (knockoutSize === 16) stageKey = "R16";
  else if (knockoutSize === 8) stageKey = "QF";
  else if (knockoutSize === 4) stageKey = "SF";
  else if (knockoutSize === 2) stageKey = "FINAL";
  
  const existing = tournament.matches.filter(
    m => m.type === "knockout"
  );
  
  if (existing.length > 0) return;
  
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
  
  tournament.matches.push(...roundMatches);
  
  tournament.knockout = {
    r16: [],
    qf: [],
    sf: [],
    final: null
  };
  
  tournament.knockout[stageKey] = roundMatches;
  
  updateTournament(tournament);
}



function updateKnockoutProgression(match) {
  const tournament = getCurrentTournament();
  if (!tournament || !match) return;
  
  if (!match.played) return;
  
  const winner =
    match.homeGoals > match.awayGoals ?
    match.home :
    match.away;
  
  if (!winner) return;
  
  if (!match.nextMatchId || !match.nextSlot) return;
  
  const nextMatch = tournament.matches.find(
    m => m.id === match.nextMatchId
  );
  
  if (!nextMatch) return;
  
  nextMatch[match.nextSlot] = winner;
  
  updateTournament(tournament);
}


function linkKnockoutRound(tournament, stageKey) {
  
  const matches =
    tournament.matches.filter(
      m => m.type === "knockout" && m.stage === stageKey
    );
  
  const nextMap = {
    R16: "QF",
    QF: "SF",
    SF: "FINAL"
  };
  
  const nextStage = nextMap[stageKey];
  if (!nextStage) return;
  
  const nextMatches =
    tournament.matches.filter(
      m => m.type === "knockout" && m.stage === nextStage
    );
  
  let j = 0;
  
  for (let i = 0; i < matches.length; i += 2) {
    
    const m1 = matches[i];
    const m2 = matches[i + 1];
    const target = nextMatches[j];
    
    if (!target) continue;
    
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


