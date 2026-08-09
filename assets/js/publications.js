(function () {
  var INSPIRE_BAI = "L.Russell.1";
  var API_URL =
    "https://inspirehep.net/api/literature?sort=mostrecent&size=250&fields=" +
    "titles,publication_info,arxiv_eprints,dois,earliest_date,collaborations,control_number" +
    "&q=" + encodeURIComponent("a " + INSPIRE_BAI);
  var PROFILE_URL = "https://inspirehep.net/authors/2686809";

  var container = document.getElementById("publications-list");
  if (!container) return;

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

  function renderEntries(hits) {
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
        var title = (metadata.titles || [])[0];
        title = title ? title.title : "Untitled";
        var recordUrl = "https://inspirehep.net/literature/" + metadata.control_number;
        var collaboration = (metadata.collaborations || [])[0];
        var venue = formatVenue(metadata);

        html += '<div class="list__item"><article class="archive__item">';
        html +=
          '<h3 class="archive__item-title"><a href="' +
          recordUrl +
          '" rel="permalink">' +
          escapeHtml(title) +
          "</a></h3>";
        if (venue || collaboration) {
          html += '<p class="archive__item-excerpt">';
          if (venue) html += escapeHtml(venue);
          if (venue && collaboration) html += " &mdash; ";
          if (collaboration) html += escapeHtml(collaboration.value) + " Collaboration";
          html += "</p>";
        }
        html += "</article></div>";
      });
    });

    container.innerHTML = html;
  }

  fetch(API_URL)
    .then(function (response) {
      if (!response.ok) throw new Error("INSPIRE API request failed");
      return response.json();
    })
    .then(function (data) {
      var hits = (data.hits || {}).hits || [];
      if (hits.length === 0) {
        container.innerHTML =
          '<p>No publications found. View my profile directly on <a href="' +
          PROFILE_URL +
          '">INSPIRE-HEP</a>.</p>';
        return;
      }
      renderEntries(hits);
    })
    .catch(function () {
      container.innerHTML =
        '<p>Sorry, the publication list couldn&rsquo;t be loaded right now. You can view it directly on <a href="' +
        PROFILE_URL +
        '">INSPIRE-HEP</a>.</p>';
    });
})();
