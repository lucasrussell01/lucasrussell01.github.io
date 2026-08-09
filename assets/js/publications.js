(function () {
  var INSPIRE_BAI = "L.Russell.1";
  var API_URL =
    "https://inspirehep.net/api/literature?sort=mostrecent&size=250&fields=" +
    "titles,publication_info,arxiv_eprints,dois,earliest_date,collaborations,control_number,citation_count" +
    "&q=" + encodeURIComponent("a " + INSPIRE_BAI);
  var PROFILE_URL = "https://inspirehep.net/authors/2686809";

  // To feature specific papers at the top of the page under "Selected Publications",
  // add their arXiv IDs below (e.g. from arxiv.org/abs/XXXX.XXXXX or the paper's
  // INSPIRE record) in the order you want them to appear. Leave empty to hide
  // the section entirely.
  var SELECTED_ARXIV_IDS = [
    // "2211.12345",
  ];

  var listContainer = document.getElementById("publications-list");
  var selectedContainer = document.getElementById("selected-publications");
  var summary = document.getElementById("all-publications-summary");
  if (!listContainer) return;

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
  }

  function formatVenue(metadata) {
    var info = (metadata.publication_info || [])[0];
    if (info && info.journal_title) {
      var parts = [info.journal_title];
      if (info.journal_volume) parts.push(info.journal_volume);
      var venue = parts.join(" ");
      if (info.artid || info.page_start) {
        venue += ", " + (info.artid || info.page_start);
      }
      return venue;
    }
    var eprint = (metadata.arxiv_eprints || [])[0];
    if (eprint) {
      return "arXiv:" + eprint.value + " (preprint)";
    }
    return "";
  }

  function renderItem(metadata) {
    var title = (metadata.titles || [])[0];
    title = title ? title.title : "Untitled";
    var recordUrl = "https://inspirehep.net/literature/" + metadata.control_number;
    var collaboration = (metadata.collaborations || [])[0];
    var venue = formatVenue(metadata);
    var citations = metadata.citation_count;

    var html = '<div class="list__item"><article class="archive__item">';
    html +=
      '<h3 class="archive__item-title"><a href="' +
      recordUrl +
      '" rel="permalink">' +
      escapeHtml(title) +
      "</a></h3>";
    if (venue || collaboration || typeof citations === "number") {
      html += '<p class="archive__item-excerpt">';
      if (venue) html += escapeHtml(venue);
      if (venue && collaboration) html += " &mdash; ";
      if (collaboration) html += escapeHtml(collaboration.value) + " Collaboration";
      if ((venue || collaboration) && typeof citations === "number") html += " &middot; ";
      if (typeof citations === "number") {
        html += citations + (citations === 1 ? " citation" : " citations");
      }
      html += "</p>";
    }
    html += "</article></div>";
    return html;
  }

  function renderFullList(hits) {
    var byYear = {};
    hits.forEach(function (hit) {
      var metadata = hit.metadata || {};
      var year = (metadata.earliest_date || "0000").slice(0, 4);
      byYear[year] = byYear[year] || [];
      byYear[year].push(metadata);
    });

    var years = Object.keys(byYear).sort().reverse();
    var html = "";

    years.forEach(function (year) {
      html += '<h2 class="archive__subtitle">' + escapeHtml(year) + "</h2>";
      byYear[year].forEach(function (metadata) {
        html += renderItem(metadata);
      });
    });

    listContainer.innerHTML = html;
    if (summary) {
      summary.textContent =
        "Show full publication list (" + hits.length + " papers, from INSPIRE-HEP)";
    }
  }

  function renderSelected(hits) {
    if (!selectedContainer || SELECTED_ARXIV_IDS.length === 0) return;

    var byArxivId = {};
    hits.forEach(function (hit) {
      var metadata = hit.metadata || {};
      var eprint = (metadata.arxiv_eprints || [])[0];
      if (eprint) byArxivId[eprint.value] = metadata;
    });

    var html = "";
    SELECTED_ARXIV_IDS.forEach(function (id) {
      var cleanId = id.replace(/^arXiv:/i, "");
      var metadata = byArxivId[cleanId];
      if (metadata) html += renderItem(metadata);
    });

    if (html) {
      selectedContainer.innerHTML = "<h2>Selected Publications</h2>" + html;
      renderMath(selectedContainer);
    }
  }

  function renderMath(el) {
    if (typeof window.renderMathInElement !== "function") return;
    window.renderMathInElement(el, {
      delimiters: [
        { left: "$", right: "$", display: false },
        { left: "\\(", right: "\\)", display: false },
        { left: "\\[", right: "\\]", display: true },
      ],
      throwOnError: false,
    });
  }

  fetch(API_URL)
    .then(function (response) {
      if (!response.ok) throw new Error("INSPIRE API request failed");
      return response.json();
    })
    .then(function (data) {
      var hits = (data.hits || {}).hits || [];
      if (hits.length === 0) {
        listContainer.innerHTML =
          '<p>No publications found. View my profile directly on <a href="' +
          PROFILE_URL +
          '">INSPIRE-HEP</a>.</p>';
        return;
      }
      renderSelected(hits);
      renderFullList(hits);
      renderMath(listContainer);
    })
    .catch(function () {
      listContainer.innerHTML =
        '<p>Sorry, the publication list couldn&rsquo;t be loaded right now. You can view it directly on <a href="' +
        PROFILE_URL +
        '">INSPIRE-HEP</a>.</p>';
    });
})();
