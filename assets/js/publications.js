(function () {
  var INSPIRE_BAI = "L.Russell.1";
  var API_URL =
    "https://inspirehep.net/api/literature?sort=mostrecent&size=250&fields=" +
    "titles,publication_info,arxiv_eprints,dois,earliest_date,collaborations,control_number,citation_count,public_notes" +
    "&q=" + encodeURIComponent("a " + INSPIRE_BAI);

  // To feature specific papers at the top of the page under "Selected Publications",
  // add their arXiv IDs below (e.g. from arxiv.org/abs/XXXX.XXXXX or the paper's
  // INSPIRE record) in the order you want them to appear. Leave empty to hide
  // the section entirely.
  //
  // Each entry can be either:
  //   - a plain arXiv ID string, e.g. "2606.03510" (venue is worked out
  //     automatically from INSPIRE, including "Submitted to X" if INSPIRE
  //     already has a note to that effect)
  //   - an object { id: "2606.03510", submittedTo: "JHEP" } to force a
  //     "Submitted to JHEP" line, for papers INSPIRE hasn't tagged yet
  //   - an object { id: "2606.03510", acceptedBy: "JHEP" } to force an
  //     "Accepted by JHEP" line, for papers accepted but not yet formally
  //     published with a journal_title on INSPIRE
  var SELECTED_ARXIV_IDS = [
    "2606.03510",
    "2511.05468",
    { id: "2608.10961", submittedTo: "Phys. Rev. D" }
  ];

  var selectedContainer = document.getElementById("selected-publications");

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
  }

  function formatVenue(metadata, submittedToOverride, acceptedByOverride) {
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

    if (acceptedByOverride) {
      var acceptedEprint = (metadata.arxiv_eprints || [])[0];
      var acceptedVenue = "Accepted by " + acceptedByOverride;
      if (acceptedEprint) acceptedVenue += " (arXiv:" + acceptedEprint.value + ")";
      return acceptedVenue;
    }

    if (submittedToOverride) {
      var overrideEprint = (metadata.arxiv_eprints || [])[0];
      var overrideVenue = "Submitted to " + submittedToOverride;
      if (overrideEprint) overrideVenue += " (arXiv:" + overrideEprint.value + ")";
      return overrideVenue;
    }

    var submittedNote = (metadata.public_notes || [])
      .map(function (n) { return n.value; })
      .find(function (v) { return /^Submitted to /i.test(v); });
    if (submittedNote) {
      var match = submittedNote.match(/^Submitted to (?:the )?(.+?)(?:\.\s+All figures|\.?\s*$)/i);
      if (match) {
        var submittedEprint = (metadata.arxiv_eprints || [])[0];
        var submittedVenue = "Submitted to " + match[1];
        if (submittedEprint) submittedVenue += " (arXiv:" + submittedEprint.value + ")";
        return submittedVenue;
      }
    }

    var eprint = (metadata.arxiv_eprints || [])[0];
    if (eprint) {
      return "arXiv:" + eprint.value + " (preprint)";
    }
    return "";
  }

  function formatAuthors(authors) {
    if (!authors || authors.length === 0) return "";
    var names = authors.map(function (a) {
      var parts = (a.full_name || "").split(",");
      var last = (parts[0] || "").trim();
      var first = (parts[1] || "").trim();
      return (first ? first.charAt(0) + ". " : "") + last;
    });
    if (names.length > 6) return names[0] + " et al.";
    if (names.length === 1) return names[0];
    return names.slice(0, -1).join(", ") + " and " + names[names.length - 1];
  }

  function fetchAuthors(arxivId) {
    var url =
      "https://inspirehep.net/api/literature?fields=authors&q=" +
      encodeURIComponent("arxiv:" + arxivId);
    return fetch(url)
      .then(function (response) {
        return response.ok ? response.json() : null;
      })
      .then(function (data) {
        var hit = data && (data.hits || {}).hits && data.hits.hits[0];
        return hit ? hit.metadata.authors || [] : [];
      })
      .catch(function () {
        return [];
      });
  }

  function renderItem(metadata, submittedToOverride, acceptedByOverride, authors) {
    var title = (metadata.titles || [])[0];
    title = title ? title.title : "Untitled";
    var recordUrl = "https://inspirehep.net/literature/" + metadata.control_number;
    var collaboration = (metadata.collaborations || [])[0];
    var venue = formatVenue(metadata, submittedToOverride, acceptedByOverride);
    var citations = metadata.citation_count;
    var authorText = collaboration ? "" : formatAuthors(authors);

    var html = '<div class="list__item"><article class="archive__item">';
    html +=
      '<h3 class="archive__item-title"><a href="' +
      recordUrl +
      '" rel="permalink">' +
      escapeHtml(title) +
      "</a></h3>";
    if (venue || collaboration || authorText || typeof citations === "number") {
      html += '<p class="archive__item-excerpt">';
      if (venue) html += escapeHtml(venue);
      if (venue && (collaboration || authorText)) html += " &mdash; ";
      if (collaboration) {
        html += escapeHtml(collaboration.value) + " Collaboration";
      } else if (authorText) {
        html += escapeHtml(authorText);
      }
      if ((venue || collaboration || authorText) && typeof citations === "number") {
        html += " &middot; ";
      }
      if (typeof citations === "number") {
        html += citations + (citations === 1 ? " citation" : " citations");
      }
      html += "</p>";
    }
    html += "</article></div>";
    return html;
  }

  function renderSelected(hits) {
    if (!selectedContainer || SELECTED_ARXIV_IDS.length === 0) return;

    var byArxivId = {};
    hits.forEach(function (hit) {
      var metadata = hit.metadata || {};
      var eprint = (metadata.arxiv_eprints || [])[0];
      if (eprint) byArxivId[eprint.value] = metadata;
    });

    var entries = SELECTED_ARXIV_IDS
      .map(function (entry) {
        var id = typeof entry === "string" ? entry : entry.id;
        var submittedTo = typeof entry === "object" ? entry.submittedTo : undefined;
        var acceptedBy = typeof entry === "object" ? entry.acceptedBy : undefined;
        var cleanId = id.replace(/^arXiv:/i, "");
        var metadata = byArxivId[cleanId];
        return metadata
          ? { metadata: metadata, submittedTo: submittedTo, acceptedBy: acceptedBy, cleanId: cleanId }
          : null;
      })
      .filter(Boolean);

    // Only fetch author names for papers without a collaboration (i.e. not a
    // CMS-wide paper) - collaboration papers can have 1000s of authors, so we
    // avoid ever requesting that field for them.
    var authorFetches = entries.map(function (e) {
      var hasCollaboration = (e.metadata.collaborations || []).length > 0;
      return hasCollaboration ? Promise.resolve(null) : fetchAuthors(e.cleanId);
    });

    Promise.all(authorFetches).then(function (authorsList) {
      var html = "";
      entries.forEach(function (e, i) {
        html += renderItem(e.metadata, e.submittedTo, e.acceptedBy, authorsList[i]);
      });

      if (html) {
        selectedContainer.innerHTML = "<h2>Selected Publications</h2>" + html;
        renderMath(selectedContainer);
      }
    });
  }

  function renderOtherDocumentCitations(hits) {
    var elements = document.querySelectorAll("[data-inspire-id]");
    if (elements.length === 0) return;

    // These documents (theses, proceedings, etc.) are already picked up by
    // the main author search below, so their citation counts are sourced
    // from that same fetch rather than a separate API call.
    var byId = {};
    hits.forEach(function (hit) {
      var metadata = hit.metadata || {};
      byId[metadata.control_number] = metadata.citation_count;
    });

    Array.prototype.forEach.call(elements, function (el) {
      var citations = byId[el.getAttribute("data-inspire-id")];
      if (typeof citations !== "number") return;
      el.textContent += " · " + citations + (citations === 1 ? " citation" : " citations");
    });
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
      if (hits.length === 0) return;
      renderSelected(hits);
      renderOtherDocumentCitations(hits);
    })
    .catch(function () {
      // Selected Publications / citation counts just stay blank on failure -
      // the static "full list on INSPIRE-HEP" link on the page still works.
    });
})();
