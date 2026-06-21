function generateTournament() {
  const enableGroups = document.getElementById("enableGroups").checked;

  const tournament = getCurrentTournament();
  if (!tournament) return;

  const teams = [...tournament.teams];
  if (teams.length < 2) {
    showAlert("❌ Add at least 2 teams");
    return;
  }

  const teamsPerGroup = parseInt(document.getElementById("teamsPerGroup").value) || 4;
  const teamsQualify = parseInt(document.getElementById("teamsQualify").value) || 2;
  const knockoutSize = parseInt(document.getElementById("knockoutRound").value);

  tournament.settings = {
    enableGroups,
    teamsPerGroup,
    teamsQualify,
    knockoutSize
  };

  if (enableGroups) {
    const totalGroups = Math.ceil(teams.length / teamsPerGroup);
    const totalQualifiers = totalGroups * teamsQualify;

    if (totalQualifiers !== knockoutSize) {
      showAlert(`⚠️ Bracket Imbalance!\n\nYour group setup yields ${totalQualifiers} qualifying teams, but your bracket size requires exactly ${knockoutSize}.\n\nAdjust your group sizes or qualified slots.`);
      return;
    }
  } else {
    if (teams.length !== knockoutSize) {
      showAlert(`⚠️ Team Count Mismatch!\n\nYou selected a ${knockoutSize}-team bracket (${getRoundName(knockoutSize)}), but you currently have ${teams.length} registered teams.\n\nEnsure they match perfectly.`);
      return;
    }
  }
tournament.knockoutMatches = [];
tournament.qualifiedTeams = [];
tournament.groupStageComplete = false;

  tournament.matches = [];
  tournament.groups = [];
  tournament.knockout = null;
  

  if (enableGroups) {
    generateGroupStage(tournament);
  } else {
    generateDirectKnockOut(tournament);
  }

  updateTournament(tournament);
  renderFixtures();
  toggleCupView('table')
  showActionModal("✅ Tournament Generated", "success");
}
 
 
 
 
 
 
 
function validateTournamentSetup(tournament, settings) {
  const teams = tournament.teams || [];

  if (teams.length < 2) {
    return {
      valid: false,
      message: "❌ Add at least 2 teams"
    };
  }

  if (settings.enableGroups) {
    const totalGroups = Math.ceil(teams.length / settings.teamsPerGroup);
    const totalQualifiers = totalGroups * settings.teamsQualify;

    if (totalQualifiers !== settings.knockoutSize) {
      return {
        valid: false,
        message: `⚠️ Bracket Imbalance!\n\nYour group setup yields ${totalQualifiers} qualifying teams, but your bracket size requires exactly ${settings.knockoutSize}.`
      };
    }
  } else {
    if (teams.length !== settings.knockoutSize) {
      return {
        valid: false,
        message: `⚠️ Team Count Mismatch!\n\nYou selected a ${settings.knockoutSize}-team bracket but currently have ${teams.length} teams.`
      };
    }
  }

  return { valid: true };
}

function getTournamentSettings() {
  return {
    enableGroups: document.getElementById("enableGroups").checked,
    teamsPerGroup: parseInt(document.getElementById("teamsPerGroup").value) || 4,
    teamsQualify: parseInt(document.getElementById("teamsQualify").value) || 2,
    knockoutSize: parseInt(document.getElementById("knockoutRound").value)
  };
}

function validateTournamentSetup(
  tournament,
  settings
) {

  const teams =
    tournament.teams || [];

  if (teams.length < 2) {

    return {
      valid: false,
      message:
        "❌ Add at least 2 teams"
    };
  }

  if (settings.enableGroups) {

    const totalGroups =
      Math.ceil(
        teams.length /
        settings.teamsPerGroup
      );

    const totalQualifiers =
      totalGroups *
      settings.teamsQualify;

    if (
      totalQualifiers !==
      settings.knockoutSize
    ) {

      return {
        valid: false,
        message:
          `⚠️ Bracket Imbalance!\n\nYour group setup yields ${totalQualifiers} qualifying teams, but your bracket size requires exactly ${settings.knockoutSize}.`
      };
    }

  } else {

    if (
      teams.length !==
      settings.knockoutSize
    ) {

      return {
        valid: false,
        message:
          `⚠️ Team Count Mismatch!\n\nYou selected a ${settings.knockoutSize}-team bracket but currently have ${teams.length} teams.`
      };
    }
  }

  return {
    valid: true
  };
}



function getTournamentSettings() {

  return {

    enableGroups:
      document.getElementById(
        "enableGroups"
      ).checked,

    teamsPerGroup:
      parseInt(
        document.getElementById(
          "teamsPerGroup"
        ).value
      ) || 4,

    teamsQualify:
      parseInt(
        document.getElementById(
          "teamsQualify"
        ).value
      ) || 2,

    knockoutSize:
      parseInt(
        document.getElementById(
          "knockoutRound"
        ).value
      )
  };
}


function renderCupFixtures() {
  const tournament = getCurrentTournament();
  if (!tournament) return;
  
  const container = document.getElementById("cupFixtures");
  if (!container) return;
  
  container.innerHTML = "";
  
  if (!tournament.groups?.length) {
    container.innerHTML = `<p class="emptyText">No Group Stage matches for Direct Knockout Cups <br> Check the bracket Section to see The KnockOut matches </p>`;
    return;
  }
  
  const currentRound = tournament.cupRound || 1;
  
  const roundLabel = document.getElementById("cupRoundLabel");
  if (roundLabel) {
    roundLabel.textContent = `Matchday ${currentRound}`;
  }
  
  tournament.groups.forEach(group => {
    const matches = (tournament.groupMatches || []).filter(
      match =>
      match.group === group.name &&
      match.round === currentRound
    );
    
    if (!matches.length) return;
    
    const groupCard = document.createElement("div");
    groupCard.className = "groupCard";
    
    groupCard.innerHTML = `
      <div class="groupHeader">
        <h3>${group.name}</h3>
      </div>

      <div class="groupMatches">
        ${matches.map((match, i) => {
          const homeLogo = tournament.teamLogos?.[match.home];
          const awayLogo = tournament.teamLogos?.[match.away];

                    return `
                    
          <div class="fixture-row" data-index="${i}">
    <div class="fixture-row-content">
    <div class="fixture-teams-stack">
      
      <div class="team-row-item">
        ${homeLogo
          ? `<img class="fixture-team-logo" src="${homeLogo}">`
          : `<div class="fixture-team-logo-placeholder">?</div>`
        }
        <span class="fixture-team-name">${match.home}</span>
      </div>
      
      <div class="team-row-item">
        ${awayLogo
          ? `<img class="fixture-team-logo" src="${awayLogo}">`
          : `<div class="fixture-team-logo-placeholder">?</div>`
        }
        <span class="fixture-team-name">${match.away}</span>
      </div>
      
    </div>

    <div class="fixture-status-pane">
      ${match.played 
        ? `
          <div class="score-stack">
            <span class="score-badge played">${match.homeGoals}</span>
            <span class="score-badge played">${match.awayGoals}</span>
          </div>
        `
        : `<span class="vs-text-alt">VS</span>`
      }
    </div>
</div>
  </div>
`;
}).join("")}
</div>
`;
   
   
    
    groupCard.addEventListener("click", e => {
      const row = e.target.closest(".fixture-row");
      if (!row) return;
      
      const match = matches[Number(row.dataset.index)];
      if (!match) return;
      
      openGroupResult(match);
    });
    
    container.appendChild(groupCard);
  });
}


function toggleCupView(view) {
  document
    .querySelectorAll(".cupTopActions .cup-tab")
    .forEach(btn => btn.classList.remove("active"));
  
  const cupBox = document.getElementById("cupBox");
  const setUpTop = document.getElementById("setUpTop");
  
  const fixtures = document.getElementById("cupFixtures");
  const tables = document.getElementById("cupTables");
  const knockOut = document.getElementById("knockOut");
  const bracketControl = document.getElementById("bracketControl");
  const home = document.getElementById("cupHome");
  const roundBar = document.querySelector(".cupRoundBar");
  const cupTab = document.getElementById("cupTab");
  const cupSchedule = document.getElementById("cupSchedule");
  
  cupBox.style.display = "none";
  setUpTop.style.display = "none";
  fixtures.style.display = "none";
  tables.style.display = "none";
  knockOut.style.display = "none";
  bracketControl.style.display = "none";
  home.style.display = "none";
  cupTab.style.display = "none";
  cupSchedule.style.display = "none";
  if (roundBar) roundBar.style.display = "none";
  
  if (view === "cupBox") {
    cupBox.style.display = "block";
    setUpTop.style.display = "flex";
    renderTeams();
  }
  
  else if (view === "fixtures") {
    fixtures.style.display = "flex";
    cupTab.style.display = "flex";
    if (roundBar) roundBar.style.display = "flex";
    
    renderCupFixtures();
    
    const tabs = document.querySelectorAll(".cup-tab");
    if (tabs[0]) tabs[0].classList.add("active");
  }
  
  else if (view === "knockOut") {
    knockOut.style.display = "flex";
    bracketControl.style.display = "flex";
    cupTab.style.display = "flex";
    
    renderFullBracket();
    
    const tabs = document.querySelectorAll(".cup-tab");
    if (tabs[2]) tabs[2].classList.add("active");
  }
  
  else {
    tables.style.display = "flex";
    cupTab.style.display = "flex";
    cupSchedule.style.display = "block";
    home.style.display = "flex";
    
    renderCupTables();
    
    const tabs = document.querySelectorAll(".cup-tab");
    if (tabs[1]) tabs[1].classList.add("active");
  }
}



function nextCupRound() {
  const tournament = getCurrentTournament();
  if (!tournament) return;
  
  const groupMatches = tournament.groupMatches || [];
  if (!groupMatches.length) return;
  
  const maxRound = Math.max(...groupMatches.map(m => m.round || 1));
  
  tournament.cupRound = (tournament.cupRound || 1) + 1;
  
  if (tournament.cupRound > maxRound) {
    tournament.cupRound = maxRound;
  }
  
  updateTournament(tournament);
  renderCupFixtures();
}

function prevCupRound() {
  const tournament = getCurrentTournament();
  if (!tournament) return;
  
  tournament.cupRound = (tournament.cupRound || 1) - 1;
  
  if (tournament.cupRound < 1) {
    tournament.cupRound = 1;
  }
  
  updateTournament(tournament);
  renderCupFixtures();
}



function toggleGroupSettings() {
  const checked = document.getElementById("enableGroups").checked;
  document.getElementById("groupOptions").style.display = checked ? "block" : "none";
}




function generateGroupStage(
  tournament
) {

  const {
    teamsPerGroup
  } = tournament.settings;

  let teams =
    [...tournament.teams];

  teams =
    teams.sort(
      () => Math.random() - 0.5
    );

  
  const groups = [];

  const groupMatches = [];

  
  const totalGroups =
    Math.ceil(
      teams.length /
      teamsPerGroup
    );

  let groupLetterCode = 65;

  
  for (
    let g = 0;
    g < totalGroups;
    g++
  ) {

    let groupTeams =
      teams.slice(
        g * teamsPerGroup,
        (g + 1) * teamsPerGroup
      );

    
    const groupName =
      `Group ${String.fromCharCode(groupLetterCode)}`;

    groupLetterCode++;

    
    groups.push({

      name: groupName,

      index: g,

      teams: [...groupTeams]
    });

    
    if (
      groupTeams.length % 2 !== 0
    ) {

      groupTeams.push("BYE");
    }

    
    const numTeams =
      groupTeams.length;

    const totalRounds =
      numTeams - 1;

    const halfSize =
      numTeams / 2;

    
    for (
      let round = 0;
      round < totalRounds;
      round++
    ) {

      for (
        let i = 0;
        i < halfSize;
        i++
      ) {

        const home =
          groupTeams[i];

        const away =
          groupTeams[
            numTeams - 1 - i
          ];

        
        if (
          home === "BYE" ||
          away === "BYE"
        ) continue;

        
        groupMatches.push({

          id:
            `GR_${groupName}_R${round + 1}_M${i + 1}`,

          type: "group",

          group: groupName,

          groupIndex: g,

          round: round + 1,

          home,

          away,

          homeGoals: null,

          awayGoals: null,

          played: false
        });
      }

      
      groupTeams.splice(
        1,
        0,
        groupTeams.pop()
      );
    }
  }

  
  tournament.groups =
    groups;

  generateGroupTables(tournament);
  tournament.groupMatches =
    groupMatches;

  
  tournament.cupRound = 1;

  
  return tournament;
}











let activeBracketInput = null;

function setBracketInput(input) {
  
  document.getElementById("knockoutHomeScore")
    .classList.remove("active");
  
  document.getElementById("knockoutAwayScore")
    .classList.remove("active");
  
  activeBracketInput = input;
  
  if (input) {
    input.classList.add("active");
  }
}



function bracketPadPress(value) {
  
  if (!activeBracketInput) return;
  
  const input = activeBracketInput;
  
  // CLEAR BUTTON
  if (value === "clear") {
    input.value = "";
    return;
  }
  
  // OPTIONAL: prevent multiple leading zeros
  if (input.value === "0") {
    input.value = value;
    return;
  }
  
  // append number
  input.value = (input.value || "") + value;
}



function getRoundName(size) {
  if (size === 16) return "Round of 16";
  if (size === 8) return "Quarterfinals";
  if (size === 4) return "Semifinals";
  if (size === 2) return "Finals";
  return `${size}-team bracket`;
}



function getRoundName(size) {
  if (size === 16) return "Round of 16";
  if (size === 8) return "Quarterfinals";
  if (size === 4) return "Semifinals";
  if (size === 2) return "Finals";
  return `${size}-team bracket`;
}





function checkForEndOfGroupstage() {
  
  const tournament =
    typeof getCurrentTournament === "function" ?
    getCurrentTournament() :
    null;
  
  if (!tournament || !tournament.groups?.length) return;
  
  
  // total expected matches (based on groups)
  let totalExpectedMatches = 0;
  
  tournament.groups.forEach(group => {
    
    let teamCount = group.teams.length;
    
    if (teamCount % 2 !== 0) {
      teamCount++;
    }
    
    const matches =
      (teamCount * (teamCount - 1)) / 2;
    
    totalExpectedMatches += matches;
  });
  
  
  // use ONLY groupMatches (correct source)
  const playedMatches =
    (tournament.groupMatches || [])
    .filter(m => m.played).length;
  
  
  if (playedMatches !== totalExpectedMatches) return;
  
  
  // prevent re-trigger
  if (tournament.groupStageComplete) return;
  
  
  // mark complete
  tournament.groupStageComplete = true;
  
  
  // ONLY THIS: get qualified teams
  const qualifiedTeams =
    getQualifiedTeams(tournament);
  
  
  tournament.qualifiedTeams =
    qualifiedTeams;
  
  
  updateTournament(tournament);
  
  
  showActionModal(
    "🏆 Group Stage Complete!",
    "success"
  );
}




function generateGroupTables(tournament) {
  
  tournament.groupTables = {};
  
  if (!tournament?.groups?.length) return {};
  
  tournament.groups.forEach(group => {
    
    const table = {};
    
    // ✅ Build initial table safely
    group.teams.forEach(team => {
      
      const teamName =
        typeof team === "string" ?
        team :
        team?.name;
      
      if (!teamName || teamName === "BYE") return;
      
      table[teamName] = {
        name: teamName,
        p: 0,
        w: 0,
        d: 0,
        l: 0,
        gf: 0,
        ga: 0,
        gd: 0,
        pts: 0,
        pos: 0
      };
    });
    
    // ✅ Safe matches access
    const matches = (tournament.groupMatches || []).filter(
      match =>
      match.group === group.name &&
      match.played
    );
    
    matches.forEach(match => {
      
      const homeName =
        typeof match.home === "string" ?
        match.home :
        match.home?.name;
      
      const awayName =
        typeof match.away === "string" ?
        match.away :
        match.away?.name;
      
      const home = table[homeName];
      const away = table[awayName];
      
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
    
    // ✅ Sort table
    const sorted = Object.values(table).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.gd !== a.gd) return b.gd - a.gd;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return a.name.localeCompare(b.name);
    });
    
    sorted.forEach((team, index) => {
      team.pos = index + 1;
    });
    
    tournament.groupTables[group.name] = sorted;
  });
  
  return tournament.groupTables;
}






 
 
 
  
let currentBracketMatch = null;

function openCupResultRecord(match) {
  
  if (!match) return;
  
  currentBracketMatch = match;
  currentBracketMatch.context = "knockout";
  
  const getName = (team) => {
    if (!team) return "Awaiting Winner";
    if (typeof team === "string") return team;
    return team.name || "Awaiting Winner";
  };
  
  document.getElementById("knockoutHomeTeam").innerText =
    getName(match.home);
  
  document.getElementById("knockoutAwayTeam").innerText =
    getName(match.away);
  
  document.getElementById("knockoutHomeScore").value =
    match.homeGoals ?? "";
  
  document.getElementById("knockoutAwayScore").value =
    match.awayGoals ?? "";
  
  document.getElementById("knockoutResultModal")
    .classList.add("active");
  
  setBracketInput(
    document.getElementById("knockoutHomeScore")
  );
}



function closeKnockoutResultModal() {
  
  document.getElementById("knockoutHomeScore")
    .classList.remove("active");
  
  document.getElementById("knockoutAwayScore")
    .classList.remove("active");
  
  document.getElementById("knockoutResultModal")
    .classList.remove("active");
  
  currentBracketMatch = null;
  activeBracketInput = null;
  currentGroupMatch = null;
}



function openGroupResult(match) {
  
  if (!match) return;
  
  currentBracketMatch = match;
  currentBracketMatch.context = "group";
  
  document.getElementById("knockoutHomeTeam").innerText =
    match.home;
  
  document.getElementById("knockoutAwayTeam").innerText =
    match.away;
  
  document.getElementById("knockoutHomeScore").value =
    match.homeGoals ?? "";
  
  document.getElementById("knockoutAwayScore").value =
    match.awayGoals ?? "";
  
  document.getElementById("knockoutResultModal")
    .classList.add("active");
    
    activeBracketInput =
  document.getElementById("knockoutHomeScore");

document.getElementById("knockoutHomeScore")
  .classList.add("active");

document.getElementById("knockoutAwayScore")
  .classList.remove("active");
}






  
function renderCupTables() {
  
  const tournament = getCurrentTournament();
  if (!tournament) return;
  
  const container = document.getElementById("cupTables");
  if (!container) return;
  
  container.innerHTML = "";
  
  if (!tournament.groups?.length) {
    container.innerHTML = `<p class="emptyText"> No table for direct Knockout Cups <br> Check the bracket section for knockout Matches </p>`;
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
                ? table.map(team => `
                    <tr>
                      <td>${team.pos}</td>
                      <td>${team.name}</td>
                      <td>${team.p}</td>
                      <td>${team.gd}</td>
                      <td>${team.pts}</td>
                    </tr>
                  `).join("")
                : `<tr><td colspan="5">No data yet</td></tr>`
            }
          </tbody>
        </table>
      </div>
    `;
    
    container.appendChild(groupCard);
  });
}





function checkForEndOfGroupstage() {
  const tournament = typeof getCurrentTournament === "function" ? getCurrentTournament() : null;
  if (!tournament || !tournament.groups?.length) return;

  let totalExpectedMatches = 0;
  tournament.groups.forEach(group => {
    let teamCount = group.teams.length;
    if (teamCount % 2 !== 0) {
      teamCount++;
    }
    const matches = (teamCount * (teamCount - 1)) / 2;
    totalExpectedMatches += matches;
  });

  const playedMatches = (tournament.groupMatches || []).filter(m => m.played).length;
  if (playedMatches !== totalExpectedMatches) return;
  if (tournament.groupStageComplete) return;

  tournament.groupStageComplete = true;
  
  tournament.qualifiedTeams = getQualifiedTeams(tournament);

  generateDirectKnockOut(tournament);

  updateTournament(tournament);
  showActionModal("🏆 Group Stage Complete & Bracket Generated!", "success");
}






function toggleCupSetUpView() {
  const setup = document.getElementById("setUpCard");
  const teams = document.getElementById("cupTeamView");
  const text = document.getElementById("cupToggleText");
  
  const isSetupVisible = setup.style.display !== "none";
  
  if (isSetupVisible) {
    
    setup.style.display = "none";
    teams.style.display = "block";
    
    text.textContent = "Hide Teams";
    
    renderTeams("cupTeamsContainer");
  } else {
    
    setup.style.display = "block";
    teams.style.display = "none";
    
    text.textContent = "Teams";
  }
}



function renderFullBracket() {
  
  const tournament = getCurrentTournament();
  if (!tournament) return;
  
  const bracketContainer =
    document.getElementById("bracket-container") ||
    document.querySelector(".bracket-layout");
  
  if (!bracketContainer) return;
  
  const matches = tournament.knockoutMatches || [];
  
  if (!matches.length) {
    bracketContainer.innerHTML = `
    
      <p class="emptyText"> Group Stage in Progress......<br> Knockout Stage Matches Will be generated once Group stage matches are completed</p>
    `;
    return;
  }
  
  const knockoutSize = tournament.settings.knockoutSize;
  
  bracketContainer.innerHTML = "";
  
  const getTeamName = (team) => {
    if (!team || team === "BYE") return "Awaiting Winner";
    if (typeof team === "string") return team;
    return team.name || "Awaiting Winner";
  };
  
  let currentRoundSize = knockoutSize;
  let roundIndex = 1;
  
  while (currentRoundSize >= 2) {
    
    const totalMatches = currentRoundSize / 2;
    
    const roundName =
      currentRoundSize === 8 ? "Quarter-Finals" :
      currentRoundSize === 4 ? "Semi-Finals" :
      currentRoundSize === 2 ? "Final" :
      `Round of ${currentRoundSize}`;
    
    const column = document.createElement("div");
    column.className = "bracket-column";
    
    const title = document.createElement("h4");
    title.className = "round-title";
    title.innerText = roundName;
    column.appendChild(title);
    
    for (let slot = 0; slot < totalMatches; slot++) {
      
      const match = matches.find(m =>
        m.roundIndex === roundIndex &&
        m.slot === slot
      );
      
      const homeName = getTeamName(match?.home);
      const awayName = getTeamName(match?.away);
      
      const homeScore = match?.homeGoals;
      const awayScore = match?.awayGoals;
      
      const isPending = !match ||
        !match.played ||
        homeName === "Awaiting Winner" ||
        awayName === "Awaiting Winner";
      
      const score =
        typeof homeScore === "number" &&
        typeof awayScore === "number" ?
        `${homeScore} - ${awayScore}` :
        "VS";
      
      const card = document.createElement("div");
      card.className = "match-card";
      
      if (isPending) {
        card.classList.add("pending-match");
      }
      
      const homeLogo = tournament.teamLogos?.[homeName];
const awayLogo = tournament.teamLogos?.[awayName];

card.innerHTML = `

  <div class="team-row home-row">
    <div class="team-side">
      ${homeLogo
        ? `<img class="fixture-team-logo" src="${homeLogo}">`
        : `<div class="fixture-team-logo-placeholder">?</div>`
      }
      <span class="team-name">${homeName}</span>
    </div>
    <span class="score-value">
      ${typeof homeScore === "number" ? homeScore : ""}
    </span>
  </div>

  ${typeof homeScore !== "number" && typeof awayScore !== "number" 
    ? `<div class="vs-container"><span class="Kvs-text">VS</span></div>` 
    : ""
  }

  <div class="team-row away-row">
    <div class="team-side">
      ${awayLogo
        ? `<img class="fixture-team-logo" src="${awayLogo}">`
        : `<div class="fixture-team-logo-placeholder">?</div>`
      }
      <span class="team-name">${awayName}</span>
    </div>
    <span class="score-value">
      ${typeof awayScore === "number" ? awayScore : ""}
    </span>
  </div>
`;

card.addEventListener("click", () => {
        if (!match) return;
        openCupResultRecord(match);
      });
      
      column.appendChild(card);
    }
    
    bracketContainer.appendChild(column);
    
    currentRoundSize /= 2;
    roundIndex++;
  }
  
  // 🏆 FINAL CHAMPION BOX (SAFE)
  const finalMatch =
    matches.find(m => m.roundIndex === roundIndex - 1);
  
  let champion = "TBD";
  
  if (finalMatch?.played) {
    
    const home = getTeamName(finalMatch.home);
    const away = getTeamName(finalMatch.away);
    
    champion =
      (finalMatch.homeGoals > finalMatch.awayGoals) ?
      home :
      away;
  }
  
  const finalBox = document.createElement("div");
  finalBox.className = "champion-box-container";
  
  finalBox.innerHTML = `
    <div class="champion-icon">🏆</div>
    <h4 class="champion-title">CHAMPION</h4>
    <div class="champion-display-box">
      ${champion}
    </div>
  `;
  
  bracketContainer.appendChild(finalBox);
}



function saveBracketResults() {
  
  if (!currentBracketMatch) return;
  
  const tournament = getCurrentTournament();
  if (!tournament) return;
  
  const homeScore =
    parseInt(document.getElementById("knockoutHomeScore").value);
  
  const awayScore =
    parseInt(document.getElementById("knockoutAwayScore").value);
  
  const context = currentBracketMatch.context;
  
  let match;
  
  
  if (context === "group") {
    
    match = tournament.groupMatches?.find(
      m => m.id === currentBracketMatch.id
    );
    
  } else {
    
    match = tournament.knockoutMatches?.find(
      m => m.id === currentBracketMatch.id
    );
  }
  
  if (!match) return;
  
  
  match.homeGoals = isNaN(homeScore) ? null : homeScore;
  match.awayGoals = isNaN(awayScore) ? null : awayScore;
  
  match.played =
    match.homeGoals !== null &&
    match.awayGoals !== null;
  
  
  if (match.played) {
    
    if (match.homeGoals > match.awayGoals) {
      match.winner = match.home;
    } else if (match.awayGoals > match.homeGoals) {
      match.winner = match.away;
    } else {
      match.winner = null;
    }
  }
  
  
  if (context !== "group") {
    processKnockoutUpdate(match, tournament);
     detectChampion(tournament);
  }
  
  
  updateTournament(tournament);
  
  closeKnockoutResultModal();
  
  
  if (context === "group") {
    renderCupFixtures();
    renderCupTables();
    checkForEndOfGroupstage();
  } else {
    renderFullBracket();
  }
}



function processKnockoutUpdate(match, tournament) {
  
  if (!match || !tournament?.knockoutMatches) {
    console.log("❌ Missing match or tournament");
    return;
  }
  
  if (!match.played) {
    console.log("⏳ Match not played yet");
    return;
  }
  
  
  const winner =
    match.homeGoals > match.awayGoals ?
    match.home :
    match.awayGoals > match.homeGoals ?
    match.away :
    null;
  
  if (!winner) {
    console.log("⚠️ No winner (draw or invalid score)");
    return;
  }
  
  console.log("🏆 WINNER FOUND:", winner.name);
  
  
  const nextRound = match.roundIndex + 1;
  const nextSlot = Math.floor(match.slot / 2);
  
  console.log("➡️ ADVANCE TARGET:", {
    fromRound: match.roundIndex,
    fromSlot: match.slot,
    toRound: nextRound,
    toSlot: nextSlot
  });
  
  const nextMatch = tournament.knockoutMatches.find(m =>
    Number(m.roundIndex) === Number(nextRound) &&
    Number(m.slot) === Number(nextSlot)
  );
  
  if (!nextMatch) {
    console.log("❌ NEXT MATCH NOT FOUND");
    console.log("Current knockout structure:", tournament.knockoutMatches);
    return;
  }
  
  console.log("✅ NEXT MATCH FOUND:", nextMatch.id);
  
  const isHome = match.slot % 2 === 0;
  
  if (isHome) {
    nextMatch.home = winner;
    console.log("📌 Placed in HOME slot");
  } else {
    nextMatch.away = winner;
    console.log("📌 Placed in AWAY slot");
  }
  
  
  nextMatch.homeGoals = null;
  nextMatch.awayGoals = null;
  nextMatch.played = false;
  nextMatch.winner = null;
  
  console.log("🔄 NEXT MATCH UPDATED:", nextMatch);
}






function detectChampion(tournament) {
  
  if (!tournament?.knockoutMatches) return null;
  
  
  const finalRound = Math.max(
    ...tournament.knockoutMatches.map(m => m.roundIndex || 0)
  );
  
  const finalMatch = tournament.knockoutMatches.find(m =>
    m.roundIndex === finalRound
  );
  
  if (!finalMatch || !finalMatch.played) return null;
  
  const champion =
    finalMatch.homeGoals > finalMatch.awayGoals ?
    finalMatch.home :
    finalMatch.awayGoals > finalMatch.homeGoals ?
    finalMatch.away :
    null;
  
  if (champion) {
    tournament.champion = champion;
    
    console.log("🏆 CHAMPION DETECTED:", champion.name);
    
    showChampionAnimation(champion);
  }
  
  return champion;
}


function showChampionAnimation(team) {
  
  const overlay = document.createElement("div");
  overlay.className = "champion-overlay";
  
  overlay.innerHTML = `
    <div class="champion-box">
      <div class="trophy">🏆</div>
      <h1>${team.name}</h1>
      <p>CHAMPION</p>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  setTimeout(() => {
    overlay.classList.add("show");
  }, 50);
  
  setTimeout(() => {
    overlay.classList.remove("show");
    setTimeout(() => overlay.remove(), 600);
  }, 3000);
  
  setTimeout(() => {
  overlay.remove();
  startChampionLoop(team);
}, 3000);
}



function startChampionLoop(team) {
  
  const loop = document.createElement("div");
  loop.className = "champion-loop";
  
  loop.innerHTML = `
    <div class="loop-content">
      <div class="trophy">🏆</div>
      <h2>${team.name} - CHAMPION</h2>
      <div class="sparkles"></div>
    </div>
  `;
  
  document.body.appendChild(loop);
}





let bracketZoom = 1;
let initialDistance = 0;

function applyBracketZoom() { // renamed to match calls
  const bracket = document.getElementById("bracket-container"); // fixed ID case
  
  if (!bracket) return;
  
  bracket.style.transform = `scale(${bracketZoom})`;
  bracket.style.transformOrigin = "top left";
}

function zoomInBracket() {
  bracketZoom += 0.1;
  if (bracketZoom > 2) bracketZoom = 2;
  applyBracketZoom();
}

function zoomOutBracket() {
  bracketZoom -= 0.1;
  if (bracketZoom < 0.5) bracketZoom = 0.5;
  applyBracketZoom();
}

function resetBracketZoom() {
  bracketZoom = 1;
  applyBracketZoom();
}

const viewport = document.getElementById("bracketViewport");
if (viewport) {
  viewport.addEventListener("touchstart", (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      initialDistance = Math.sqrt(dx * dx + dy * dy);
    }
  }, { passive: false });
  
  viewport.addEventListener("touchmove", e => {
    if (e.touches.length !== 2 || !initialDistance) return;
    
    e.preventDefault();
    
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const scaleChange = distance / initialDistance;
    bracketZoom = Math.min(Math.max(bracketZoom * scaleChange, 0.5), 2);
    
    applyBracketZoom();
    initialDistance = distance;
  }, { passive: false });
  
  viewport.addEventListener("touchend", () => {
    initialDistance = 0;
  });
}


async function shareBracket() {
  const bracket = document.getElementById("bracket-container");
  if (!bracket) return;

  try {
    const canvas = await html2canvas(bracket, {
      backgroundColor: "#0d1117",
      scale: 2,
      useCORS: true,
      scrollX: 0,
      scrollY: 0,
      width: bracket.scrollWidth,
      height: bracket.scrollHeight,
      windowWidth: bracket.scrollWidth,
      windowHeight: bracket.scrollHeight
    });

    canvas.toBlob(async blob => {
      const file = new File(
        [blob],
        "tournament-bracket.png",
        { type: "image/png" }
      );

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Tournament Bracket"
        });
      } else {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "tournament-bracket.png";
        link.click();
      }
    });

  } catch (err) {
    console.error(err);
  }
}


function generateDirectKnockOut(tournament) {
  if (!tournament) return;

  const knockoutSize = tournament.settings?.knockoutSize;
  if (!knockoutSize) return;

  const useGroups = tournament.settings?.enableGroups;
  

  let teams = useGroups ? getQualifiedTeams(tournament) : (tournament.teams || []);

  if (!teams.length) return;

 
  const pairedTeams = getKnockoutPairings(teams, knockoutSize, useGroups);
  if (!pairedTeams.length) return;

  const knockoutMatches = [];
  const totalRounds = Math.log2(knockoutSize);

 
  for (let i = 0; i < pairedTeams.length; i += 2) {
    knockoutMatches.push({
      id: `KO_R1_M${i / 2}`,
      roundIndex: 1,
      slot: i / 2,
      home: pairedTeams[i],
      away: pairedTeams[i + 1],
      homeGoals: null,
      awayGoals: null,
      played: false,
      winner: null
    });
  }

  // Rounds 2+
  for (let round = 2; round <= totalRounds; round++) {
    const matchesInRound = Math.pow(2, totalRounds - round);
    for (let slot = 0; slot < matchesInRound; slot++) {
      knockoutMatches.push({
        id: `KO_R${round}_M${slot}`,
        roundIndex: round,
        slot,
        home: { id: null, name: "Awaiting Winner", isPlaceholder: true },
        away: { id: null, name: "Awaiting Winner", isPlaceholder: true },
        homeGoals: null, awayGoals: null,
        played: false, winner: null
      });
    }
  }

  tournament.knockoutMatches = knockoutMatches;
  return knockoutMatches;
}



function getKnockoutPairings(teams, knockoutSize, useGroups) {
  if (!teams.length) return [];
  
  if (!useGroups) {
  
    return [...teams].sort(() => Math.random() - 0.5).slice(0, knockoutSize);
  }
  

  return pairByGroupRules(teams, knockoutSize);
}



function pairByGroupRules(teams, knockoutSize) {

  const seeds = teams.filter(t => t.pos === 1);
  const runners = teams.filter(t => t.pos === 2);
  

  seeds.sort((a, b) => String(a.group).localeCompare(String(b.group)));
  runners.sort((a, b) => String(a.group).localeCompare(String(b.group)));
  
  const result = [];
  const numMatches = knockoutSize / 2;


  const offset = Math.ceil(numMatches / 2);

  for (let i = 0; i < numMatches; i++) {
    const seed = seeds[i];
    

    const runnerIndex = (i + offset) % runners.length;
    const runner = runners[runnerIndex];

    if (seed && runner) {
      result.push(seed);
      result.push(runner);
    }
  }
  
  return result;
}








function getQualifiedTeams(tournament) {
  if (!tournament || !tournament.groups || !tournament.settings) return [];
  

  if (typeof generateGroupTables === "function") {
    generateGroupTables(tournament);
  }
  
  const { teamsQualify } = tournament.settings;
  const qualifiedTeams = [];
  
  tournament.groups.forEach(group => {
    const table = tournament.groupTables?.[group.name] || [];
    

    const sortedTeams = [...table].sort((a, b) => (a.pos || 0) - (b.pos || 0));
    
    for (let i = 0; i < teamsQualify; i++) {
      const standingRow = sortedTeams[i];
      if (!standingRow) continue;
      
      const teamName = standingRow.name || standingRow.team;
      
      const teamData = tournament.teams.find(t =>
        (typeof t === "string" ? t : t.name) === teamName
      );
      
      qualifiedTeams.push({
        id: teamData?.id || null,
        name: teamName,
        group: group.name,
        pos: i + 1,
        isBye: false
      });
    }
  });
  
  return qualifiedTeams;
}





