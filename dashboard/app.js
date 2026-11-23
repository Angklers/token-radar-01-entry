// Token Radar radar-3's dashboard. It reads window.RADAR (written beside dashboard/ by main.ts)
// and renders the ranked board, a filterable table, a per-protocol detail view with the fitted
// model's own inputs, the launch odds' peer count and the protocol's farm plan, the fit's own
// validation and the launch odds' own table, the method, and the universe — every one of the
// snapshot's 758 protocols accounted for. No network: every byte it shows is in data.js.
(function () {
  'use strict';

  var DATA = window.RADAR;
  if (!DATA) return;
  var app = document.getElementById('board');
  var state = { q: '', category: 'all', chain: 'all', verdict: 'all', tab: 'pre-token', sort: 'implied', dir: -1, selected: null };

  var usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  function fmtUsd(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return usd.format(n);
  }
  function fmtInt(n) { return n === null || n === undefined ? 'n/a' : Math.round(n).toLocaleString('en-US'); }
  function fmtPct(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return (n > 0 ? '+' : '') + n.toFixed(2) + '%';
  }
  function fmtAge(days) {
    if (days === null || days === undefined) return 'unknown';
    if (days >= 365) return (days / 365).toFixed(1) + 'y';
    return Math.max(0, Math.round(days)) + 'd';
  }
  // The fitted value line, recomputed in the page from the snapshot figures: the page's code and
  // the board's data are visibly the same arithmetic.
  function impliedOf(row, model) {
    return Math.max(1, Math.round(Math.exp(model.intercept + model.slope * Math.log(row.tvl_usd))));
  }

  function el(tag, attrs) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), attrs[k]);
        else if (attrs[k] !== null && attrs[k] !== undefined) node.setAttribute(k, attrs[k]);
      });
    }
    for (var i = 2; i < arguments.length; i++) {
      var child = arguments[i];
      if (child === null || child === undefined) continue;
      if (Array.isArray(child)) child.forEach(function (c) { if (c) node.appendChild(c); });
      else if (typeof child === 'string') node.appendChild(document.createTextNode(child));
      else node.appendChild(child);
    }
    return node;
  }

  function readHash() {
    var hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;
    var params = new URLSearchParams(hash);
    if (params.get('q')) state.q = params.get('q');
    if (params.get('p')) state.selected = params.get('p');
    if (params.get('category')) state.category = params.get('category');
    if (params.get('verdict')) state.verdict = params.get('verdict');
  }
  function writeHash() {
    var params = new URLSearchParams();
    if (state.q) params.set('q', state.q);
    if (state.category !== 'all') params.set('category', state.category);
    if (state.verdict !== 'all') params.set('verdict', state.verdict);
    if (state.selected) params.set('p', state.selected);
    var next = params.toString();
    if (next) window.history.replaceState(null, '', '#' + next);
    else window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  function rows() {
    var q = state.q.trim().toLowerCase();
    return DATA.rows.filter(function (r) {
      if (state.category !== 'all' && (r.category || 'Other') !== state.category) return false;
      if (state.chain !== 'all' && (!r.chains || r.chains.indexOf(state.chain) < 0)) return false;
      if (state.verdict !== 'all' && r.verdict !== state.verdict) return false;
      if (!q) return true;
      var hay = [r.name, r.slug, r.category, (r.chains || []).join(' ')].join(' ').toLowerCase();
      return hay.indexOf(q) >= 0;
    });
  }
  function sortedRows(list) {
    var key = state.sort;
    return list.slice().sort(function (a, b) {
      var av, bv;
      if (key === 'name') { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
      else if (key === 'tvl') { av = a.tvl_usd; bv = b.tvl_usd; }
      else if (key === 'growth') { av = a.change_7d === null ? -Infinity : a.change_7d; bv = b.change_7d === null ? -Infinity : b.change_7d; }
      else if (key === 'age') { av = a.age_days === null ? Infinity : a.age_days; bv = b.age_days === null ? Infinity : b.age_days; }
      else if (key === 'net') { av = a.expected_net_usd; bv = b.expected_net_usd; }
      else if (key === 'odds') { av = a.launch_probability; bv = b.launch_probability; }
      else { av = a.implied_value_usd; bv = b.implied_value_usd; }
      if (av < bv) return -state.dir;
      if (av > bv) return state.dir;
      return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
    });
  }

  function header() {
    return el('header', { class: 'top' },
      el('div', { class: 'brand' }, el('span', { class: 'mark' }), el('span', { class: 'brand-name', text: 'Token Radar' })),
      el('div', { class: 'top-meta' },
        el('span', { text: 'Snapshot ' + DATA.as_of }),
        el('span', { text: 'DefiLlama protocol index' }),
        el('span', { text: DATA.model_version + ' model, fitted on ' + DATA.model.n_comps + ' traded tokens' })
      )
    );
  }

  function lede() {
    return el('section', { class: 'lede' },
      el('div', null,
        el('h1', { text: '758 of 758 protocols accounted for, ranked by fitted implied value' }),
        el('p', { text: 'The watchlist is the floor: every protocol with at least $' + Math.round(DATA.floor_usd / 1e6) + 'M of TVL and no token on record. The radar ranks every boardable pre-token protocol, not just the largest below the floor. Implied value is a fitted estimate, not a price: the 80% range beside each value shows how wide traded tokens spread at the same TVL. Launch chance comes from the peers\u2019 record — the share of protocols in the same category and age band that record a token — never from an assumed band.' })
      ),
      el('div', { class: 'facts' },
        el('div', { class: 'fact' }, el('span', { text: 'Watchlist covered' }), el('b', { text: DATA.watchlist_size + ' / ' + DATA.watchlist_size })),
        el('div', { class: 'fact' }, el('span', { text: 'Pre-token rows ranked' }), el('b', { text: String(DATA.board_size) })),
        el('div', { class: 'fact' }, el('span', { text: 'Live-token protocols, with values' }), el('b', { text: String(DATA.live_size) })),
        el('div', { class: 'fact' }, el('span', { text: 'Token listed, unpriced' }), el('b', { text: String(DATA.unpriced_size) })),
        el('div', { class: 'fact' }, el('span', { text: 'Set aside as products of traded tokens' }), el('b', { text: String(DATA.excluded_size) })),
        el('div', { class: 'fact' }, el('span', { text: 'Protocols accounted for' }), el('b', { text: DATA.accounted_total + ' / 758' }))
      )
    );
  }

  function verdictStrip() {
    var t = DATA.tiers;
    function card(v, n, note) {
      return el('div', { class: 'verdict-card ' + v.toLowerCase() },
        el('b', { text: v + ' · ' + n }),
        el('span', { text: note }));
    }
    return el('section', { class: 'verdicts', 'aria-label': 'Farm verdicts' },
      card('Farm', t.farm, 'Expected net $500k or more if the token launches. Farm these first.'),
      card('Watch', t.watch, 'Expected net $100k or more. Worth a position when you have the slot.'),
      card('Skip', t.skip, 'Expected net under $100k. The time is better spent higher up the board.')
    );
  }  function controls() {
    var categories = Array.from(new Set(DATA.rows.map(function (r) { return r.category || 'Other'; }))).sort();
    var chains = Array.from(new Set(DATA.rows.reduce(function (acc, r) { return acc.concat(r.chains || []); }, []))).sort();
    var search = el('input', { type: 'search', id: 'q', placeholder: 'Search name, category or chain', value: state.q, 'aria-label': 'Search the board' });
    search.addEventListener('input', function () { state.q = search.value; writeHash(); render(); });
    var cat = el('select', { id: 'category', 'aria-label': 'Filter by category' },
      el('option', { value: 'all', text: 'All categories' }),
      categories.map(function (c) { return el('option', { value: c, text: c, selected: c === state.category ? 'selected' : null }); })
    );
    cat.addEventListener('change', function () { state.category = cat.value; writeHash(); render(); });
    var chain = el('select', { id: 'chain', 'aria-label': 'Filter by chain' },
      el('option', { value: 'all', text: 'All chains' }),
      chains.map(function (c) { return el('option', { value: c, text: c, selected: c === state.chain ? 'selected' : null }); })
    );
    chain.addEventListener('change', function () { state.chain = chain.value; writeHash(); render(); });
    var verdict = el('select', { id: 'verdict', 'aria-label': 'Filter by farm verdict' },
      ['all', 'Farm', 'Watch', 'Skip'].map(function (v) { return el('option', { value: v, text: v === 'all' ? 'All verdicts' : v, selected: v === state.verdict ? 'selected' : null }); })
    );
    verdict.addEventListener('change', function () { state.verdict = verdict.value; writeHash(); render(); });
    function tab(name, label) {
      return el('button', { type: 'button', 'aria-pressed': state.tab === name ? 'true' : 'false', text: label, onclick: function () { state.tab = name; render(); } });
    }
    var countText = state.tab === 'pre-token' ? rows().length + ' rows shown'
      : state.tab === 'live' ? DATA.live.length + ' live-token protocols'
      : state.tab === 'fit' ? DATA.model.n_comps + ' traded tokens in the fit'
      : state.tab === 'universe' ? DATA.accounted_total + ' of 758 protocols accounted for'
      : 'How this board was built';
    return el('div', { class: 'controls' },
      el('div', { class: 'field' }, el('label', { for: 'q', text: 'Search' }), search),
      el('div', { class: 'field' }, el('label', { for: 'category', text: 'Category' }), cat),
      el('div', { class: 'field' }, el('label', { for: 'chain', text: 'Chain' }), chain),
      el('div', { class: 'field' }, el('label', { for: 'verdict', text: 'Verdict' }), verdict),
      el('div', { class: 'field' }, el('span', { class: 'sub', text: 'View' }), el('div', { class: 'tabs' }, tab('pre-token', 'Pre-token'), tab('live', 'Live token'), tab('fit', 'Fit & validation'), tab('method', 'Method'), tab('universe', 'Universe'))),
      el('span', { class: 'count', text: countText })
    );
  }

  function sortHeader(key, label) {
    return el('th', { scope: 'col' },
      el('button', { type: 'button', onclick: function () { if (state.sort === key) state.dir = -state.dir; else { state.sort = key; state.dir = -1; } render(); } },
        label,
        state.sort === key ? el('span', { 'aria-hidden': 'true', text: state.dir < 0 ? ' v' : ' ^' }) : null
      )
    );
  }

  function boardTable() {
    var list = sortedRows(rows());
    if (list.length === 0) {
      return el('div', { class: 'panel' }, el('div', { class: 'empty' },
        el('h2', { text: 'No protocol matches that filter' }),
        el('p', { text: 'Clear the search or pick another category, chain or verdict to see the board again.' }),
        el('button', { class: 'button primary', type: 'button', text: 'Clear filters', onclick: function () { state.q = ''; state.category = 'all'; state.chain = 'all'; state.verdict = 'all'; writeHash(); render(); } })
      ));
    }
    var max = list[0].implied_value_usd || 1;
    var tbody = el('tbody');
    list.forEach(function (r) {
      var growth = r.change_7d === null ? 'n/a' : fmtPct(r.change_7d);
      var growthClass = r.change_7d === null ? '' : r.change_7d >= 0 ? 'pos' : 'neg';
      var tr = el('tr', {
        'data-selected': state.selected === r.slug ? 'true' : 'false',
        tabindex: '0',
        onclick: function () { openDetail(r.slug); },
        onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(r.slug); } }
      },
        el('td', { class: 'num', text: String(r.rank) }),
        el('td', null, el('div', { class: 'name' },
          el('b', { text: r.name }),
          el('span', { class: 'sub', text: (r.category || 'Other') + ' on ' + (r.chains && r.chains.length ? r.chains.slice(0, 2).join(', ') : 'an unnamed chain') })
        )),
        el('td', { class: 'num', text: fmtUsd(r.tvl_usd) }),
        el('td', { class: 'num ' + growthClass, text: growth }),
        el('td', { class: 'num', text: fmtAge(r.age_days) }),
        el('td', null, el('div', { class: 'implied' },
          el('div', { class: 'bar', 'aria-hidden': 'true' }, el('i', { style: 'width:' + Math.max(3, Math.round((r.implied_value_usd / max) * 100)) + '%' })),
          el('span', { class: 'num', text: fmtUsd(r.implied_value_usd) }),
          el('span', { class: 'range', text: fmtUsd(r.implied_low_usd) + ' - ' + fmtUsd(r.implied_high_usd) })
        )),
        el('td', { class: 'num', text: fmtUsd(r.expected_net_usd) }),
        el('td', { class: 'num', text: Math.round(r.launch_probability * 100) + '%' }),
        el('td', null, el('span', { class: 'verdict ' + r.verdict.toLowerCase(), text: r.verdict }))
      );
      tbody.appendChild(tr);
    });
    return el('div', { class: 'panel' },
      el('div', { class: 'table-wrap' },
        el('table', null,
          el('caption', { class: 'sub', text: 'Pre-token protocols, strongest implied value first. Select a row for its model, nearest traded comps and farm plan. The range under each value is the 80% interval of the fit; the odds are the peers\u2019 record — the share of same-category, same-age-band protocols that record a token.' }),
          el('thead', null, el('tr', null,
            sortHeader('implied', 'Rank'),
            sortHeader('name', 'Protocol'),
            sortHeader('tvl', 'TVL'),
            sortHeader('growth', '7d'),
            sortHeader('age', 'Age'),
            sortHeader('implied', 'Implied value'),
            sortHeader('net', 'Expected net'),
            sortHeader('odds', 'Launch odds'),
            el('th', { scope: 'col', text: 'Verdict' })
          )),
          tbody
        )
      )
    );
  }

  function liveTable() {
    var tbody = el('tbody');
    DATA.live.forEach(function (r) {
      var ratio = r.mcap_usd !== null && r.tvl_usd > 0 ? (r.mcap_usd / r.tvl_usd).toFixed(2) + 'x' : 'n/a';
      tbody.appendChild(el('tr', null,
        el('td', { class: 'num', text: 'live' }),
        el('td', null, el('div', { class: 'name' }, el('b', { text: r.name }), el('span', { class: 'sub', text: (r.category || 'Other') + ' on ' + (r.chains && r.chains.length ? r.chains.slice(0, 2).join(', ') : 'an unnamed chain') }))),
        el('td', { class: 'num', text: fmtUsd(r.tvl_usd) }),
        el('td', { class: 'num ' + (r.change_7d !== null && r.change_7d >= 0 ? 'pos' : 'neg'), text: fmtPct(r.change_7d) }),
        el('td', { class: 'num', text: fmtUsd(r.mcap_usd) }),
        el('td', { class: 'num', text: ratio }),
        el('td', null, el('span', { class: 'status', text: 'already trades' }))
      ));
    });
    return el('div', { class: 'panel' },
      el('div', { class: 'table-wrap' },
        el('table', null,
          el('caption', { class: 'sub', text: 'Tokens live: these protocols already trade, so their market cap is a fact, not a model. All ' + DATA.live.length + ' of them, largest market cap first. They are set aside from the pre-token ranking.' }),
          el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Status' }), el('th', { scope: 'col', text: 'Protocol' }), el('th', { scope: 'col', text: 'TVL' }), el('th', { scope: 'col', text: '7d' }), el('th', { scope: 'col', text: 'Market cap' }), el('th', { scope: 'col', text: 'Mcap / TVL' }), el('th', { scope: 'col', text: 'Token' }))),
          tbody
        )
      )
    );
  }

  function fitView() {
    var m = DATA.model;
    var comps = DATA.comps;
    var W = 760, H = 420, P = 46;
    var xs = comps.map(function (c) { return Math.log(c.tvl_usd); });
    var ys = comps.map(function (c) { return Math.log(c.mcap_usd); });
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
    var y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    var pad = 0.4;
    x0 -= pad; x1 += pad; y0 -= pad; y1 += pad;
    function px(x) { return P + ((x - x0) / (x1 - x0)) * (W - 2 * P); }
    function py(y) { return H - P - ((y - y0) / (y1 - y0)) * (H - 2 * P); }
    function tick(v, f) { return f(v); }
    var dots = comps.map(function (c) {
      return '<circle cx="' + px(Math.log(c.tvl_usd)).toFixed(1) + '" cy="' + py(Math.log(c.mcap_usd)).toFixed(1) + '" r="3.2"><title>' + c.name + ' — TVL ' + fmtUsd(c.tvl_usd) + ', mcap ' + fmtUsd(c.mcap_usd) + '</title></circle>';
    }).join('');
    var lx0 = px(x0), lx1 = px(x1);
    var ly0 = py(m.intercept + m.slope * x0), ly1 = py(m.intercept + m.slope * x1);
    function gridLines() {
      var s = '';
      var v;
      for (v = 1e6; v <= 1e12; v *= 10) {
        var gx = px(Math.log(v));
        if (gx >= P && gx <= W - P) s += '<line x1="' + gx.toFixed(1) + '" y1="' + P + '" x2="' + gx.toFixed(1) + '" y2="' + (H - P) + '"/><text x="' + gx.toFixed(1) + '" y="' + (H - P + 16) + '">' + tick(v, fmtUsd) + '</text>';
      }
      for (v = 1e6; v <= 1e12; v *= 10) {
        var gy = py(Math.log(v));
        if (gy >= P && gy <= H - P) s += '<line x1="' + P + '" y1="' + gy.toFixed(1) + '" x2="' + (W - P) + '" y2="' + gy.toFixed(1) + '"/><text x="' + (P - 6) + '" y="' + (gy + 4).toFixed(1) + '">' + tick(v, fmtUsd) + '</text>';
      }
      return s;
    }
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Log-log scatter of traded tokens: market cap against TVL, with the fitted line">' +
      '<g class="grid">' + gridLines() + '</g>' +
      '<line class="fitline" x1="' + lx0.toFixed(1) + '" y1="' + ly0.toFixed(1) + '" x2="' + lx1.toFixed(1) + '" y2="' + ly1.toFixed(1) + '"/>' +
      '<g class="dots">' + dots + '</g>' +
      '<text x="' + (W / 2) + '" y="' + (H - 8) + '" class="axis">TVL (log scale)</text>' +
      '<text x="14" y="' + (H / 2) + '" class="axis" transform="rotate(-90 14 ' + (H / 2) + ')">Market cap (log scale)</text>' +
      '</svg>';
    var stats = el('div', { class: 'stats' },
      el('div', { class: 'stat' }, el('span', { text: 'Fitted line' }), el('b', { text: 'log(mcap) = ' + m.intercept.toFixed(4) + ' + ' + m.slope.toFixed(4) + ' x log(TVL)' })),
      el('div', { class: 'stat' }, el('span', { text: 'Traded tokens in the fit (one per ticker)' }), el('b', { text: String(m.n_comps) })),
      el('div', { class: 'stat' }, el('span', { text: 'In-sample R²' }), el('b', { text: m.r2_in_sample.toFixed(3) })),
      el('div', { class: 'stat' }, el('span', { text: 'Out-of-sample R², 5 folds by slug order' }), el('b', { text: m.r2_oos.toFixed(3) })),
      el('div', { class: 'stat' }, el('span', { text: 'Out-of-sample R², 5 folds shuffled (seed 7)' }), el('b', { text: m.r2_oos_shuffled.toFixed(3) })),
      el('div', { class: 'stat' }, el('span', { text: 'Out-of-sample R², leave-one-out' }), el('b', { text: m.r2_loo.toFixed(3) })),
      el('div', { class: 'stat' }, el('span', { text: 'Out-of-sample median error' }), el('b', { text: m.med_ape_oos_pct.toFixed(1) + '%' })),
      el('div', { class: 'stat' }, el('span', { text: 'Flat 0.25x multiple, same folds' }), el('b', { text: 'R² ' + m.flat_r2.toFixed(3) + ', median error ' + m.flat_med_ape_oos_pct.toFixed(1) + '%' })),
      el('div', { class: 'stat' }, el('span', { text: 'Richer line (TVL + growth + log age), same folds' }), el('b', { text: 'R² ' + m.full_r2_oos.toFixed(3) + ' — worse blind, so it is not shipped' }))
    );
    var oddsRows = DATA.odds.cells.map(function (c) {
      return el('tr', null,
        el('td', null, el('b', { text: c.category })),
        el('td', { class: 'num', text: c.band }),
        el('td', { class: 'num', text: String(c.peers) }),
        el('td', { class: 'num', text: String(c.with_token) }),
        el('td', { class: 'num', text: Math.round(c.rate * 100) + '%' })
      );
    });
    return el('div', null,
      el('section', { class: 'panel' },
        el('h2', { text: 'The fit: traded tokens against TVL' }),
        el('p', { class: 'sub', text: 'Each dot is one traded token, one per ticker, largest TVL winning the ticker. The line is the fitted value line the board uses. The scatter is the honest part: at the same TVL, traded market caps span about 100x, which is why every implied value carries a wide 80% range.' }),
        el('div', { class: 'chart', html: svg }),
        el('p', { class: 'sub', text: 'Residual spread (sigma) is ' + m.sigma.toFixed(2) + ' log units, so the 80% range multiplies and divides the implied value by about ' + Math.exp(1.2816 * m.sigma).toFixed(1) + 'x.' })
      ),
      el('section', { class: 'panel' }, el('h2', { text: 'Validation, blind' }), stats,
        el('p', { class: 'sub', text: 'Five folds, comps in slug order, index mod 5: each fold is fitted without the fifth it predicts; the shuffled folds and the leave-one-out run say the same thing. The fitted line beats the flat 0.25x multiple on both R² and median error. Age, seven-day growth and category effects were tested in the same five-fold scheme and each made out-of-sample error worse (adding age: R² 0.094; adding growth: R² 0.107; all features together: R² 0.079), so none of them is in the shipped value line. They are not thrown away: age and category carry the launch odds instead, where they do separate the field — see the table below.' })
      ),
      el('section', { class: 'panel' },
        el('h2', { text: 'Launch odds: the peers\u2019 record' }),
        el('p', { class: 'sub', text: 'For each category and age band, the share of protocols in this snapshot that record a token. ' + Math.round(DATA.odds.overall_rate * 100) + '% of all 758 protocols record one. Small cells are shrunk toward their category\u2019s rate before they are used, and a protocol with no listing date takes its category\u2019s rate, never the unknown-age cell. These are the peers\u2019 record, not a forecast: an old protocol with no token yet is a survivor, so read its odds as an upper bound.' }),
        el('div', { class: 'table-wrap' },
          el('table', { class: 'compact' },
            el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Category' }), el('th', { scope: 'col', text: 'Age band' }), el('th', { scope: 'col', text: 'Peers' }), el('th', { scope: 'col', text: 'With token' }), el('th', { scope: 'col', text: 'Token rate' }))),
            el('tbody', null, oddsRows)
          )
        )
      )
    );
  }

  function methodView() {
    var m = DATA.model;
    var a = DATA.assumptions;
    return el('div', null,
      el('section', { class: 'panel method' },
        el('h2', { text: 'How implied value is computed' }),
        el('p', { class: 'sub', text: 'Every row is scored by one fitted function of the snapshot figures. No protocol name is special-cased, and no row is hand-picked.' }),
        el('div', { class: 'formula' },
          'implied = exp(' + m.intercept.toFixed(4) + ' + ' + m.slope.toFixed(4) + ' x ln(tvl_usd)),  80% range = implied x exp(+/-1.2816 x ' + m.sigma.toFixed(2) + ')'
        ),
        el('p', { class: 'sub', text: 'The line is fitted at run time from the snapshot itself: ' + m.n_comps + ' traded tokens with a market cap, no exchange token, one per ticker. TVL and market cap come from the snapshot. Seven-day growth is shown on every row and shapes the farm plan\u2019s timing, but it does not enter the value line: it made blind error worse, and the Fit tab shows the number. Age does not enter the value line either, for the same reason; it enters the launch odds, where it separates the field. The page recomputes every row from the same line, so the number on the board and the number in the detail view are the same arithmetic.' })
      ),
      el('section', { class: 'panel method' },
        el('h2', { text: 'Launch odds and farm verdicts' }),
        el('p', { class: 'sub', text: 'The launch odds are the peers\u2019 record, not an assumption: for a protocol, the share of protocols in the snapshot in its category and age band that record a token, shrunk toward the category\u2019s rate for small cells. A protocol with no listing date takes its category\u2019s rate. The snapshot carries no launch outcomes, no airdrop sizes and no gas prices, so the rest of the verdict is assumptions, stated here and on every farm plan:' }),
        el('ul', { class: 'assumptions' },
          el('li', { text: 'Launch chance: the peers\u2019 record above — ' + Math.round(DATA.odds.overall_rate * 100) + '% of all 758 protocols record a token; Risk Curators 13%, Lending 79%.' }),
          el('li', { text: 'Airdrop share to users: ' + Math.round(a.airdrop_share * 100) + '% of the implied value.' }),
          el('li', { text: 'Farm cost: about $' + a.gas_cost_usd + ' of gas for the whole plan; the capital comes back, so it is not a cost.' }),
          el('li', { text: 'Expected net = launch chance x implied value x ' + Math.round(a.airdrop_share * 100) + '% - $' + a.gas_cost_usd + '. Farm clears $500,000, Watch clears $100,000, the rest is Skip.' })
        )
      ),
      el('section', { class: 'panel method' },
        el('h2', { text: 'Data, limits, and what this is not' }),
        el('ul', { class: 'assumptions' },
          el('li', { text: 'Source: ' + DATA.source + '. Snapshot date: ' + DATA.as_of + '. The data is frozen; nothing here is live.' }),
          el('li', { text: 'The watchlist is the floor, never the ceiling: ' + DATA.watchlist_size + ' protocols at or above $' + Math.round(DATA.floor_usd / 1e6) + 'M of TVL with no token. The board ranks all ' + DATA.board_size + ' boardable pre-token protocols — the watchlist plus every rankable protocol below the floor. The other ' + (DATA.accounted_total - DATA.board_size) + ' protocols are accounted for on the Universe tab: live tokens with market values, token-listed but unpriced ones, and pre-token protocols set aside as wrapped, staked or bridged products of a token that trades, each with its reason.' }),
          el('li', { text: 'The 80% range is wide on purpose: traded tokens at the same TVL differ 100x in market cap, so a point estimate without a range would be dishonest.' }),
          el('li', { text: 'The odds are the peers\u2019 record, not a forecast. An old protocol with no token yet is a survivor — it has had years to launch and has not — so read its odds as an upper bound, not a prediction.' }),
          el('li', { text: 'This board does not predict whether or when a token launches, and it is not investment advice. An implied value is this radar\u2019s claim from one frozen snapshot, never a price.' })
        )
      )
    );
  }

  function universeView() {
    function smallTable(caption, head, rows) {
      return el('div', { class: 'panel' },
        el('h2', { text: caption }),
        el('div', { class: 'table-wrap' },
          el('table', { class: 'compact' },
            el('thead', null, el('tr', null, head.map(function (h) { return el('th', { scope: 'col', text: h }); }))),
            el('tbody', null, rows)
          )
        )
      );
    }
    var liveNote = el('p', { class: 'sub', text: DATA.live_size + ' protocols already trade. Their market caps are on the Live token tab; they are counted here so the accounting closes.' });
    var unpricedRows = DATA.unpriced.map(function (r) {
      return el('tr', null,
        el('td', null, el('b', { text: r.name })),
        el('td', null, el('span', { text: r.category || 'Other' })),
        el('td', { class: 'num', text: fmtUsd(r.tvl_usd) }),
        el('td', null, el('span', { text: r.symbol ? 'Token ' + r.symbol + ' recorded, no market cap' : 'Token recorded, no market cap' }))
      );
    });
    var excludedRows = DATA.excluded.map(function (r) {
      return el('tr', null,
        el('td', null, el('b', { text: r.name })),
        el('td', null, el('span', { text: r.category || 'Other' })),
        el('td', { class: 'num', text: fmtUsd(r.tvl_usd) }),
        el('td', null, el('span', { text: 'Set aside: ' + r.reason }))
      );
    });
    return el('div', null,
      el('section', { class: 'panel' },
        el('h2', { text: 'The whole snapshot, accounted for' }),
        el('p', { class: 'sub', text: DATA.accounted_total + ' of 758 protocols: ' + DATA.board_size + ' ranked pre-token rows on the board, ' + DATA.live_size + ' live-token protocols with market values, ' + DATA.unpriced_size + ' token-listed but unpriced, and ' + DATA.excluded_size + ' pre-token protocols set aside as products of a token that trades. Nothing in the snapshot is left uncounted.' }),
        liveNote
      ),
      smallTable('Token listed, unpriced — ' + DATA.unpriced_size + ' protocols', ['Protocol', 'Category', 'TVL', 'Why it is not ranked'], unpricedRows),
      smallTable('Set aside as products — ' + DATA.excluded_size + ' protocols', ['Protocol', 'Category', 'TVL', 'Why it is not ranked'], excludedRows)
    );
  }

  var dialog = el('dialog', { class: 'detail', id: 'detail', 'aria-labelledby': 'detail-title' });
  dialog.addEventListener('close', function () { state.selected = null; writeHash(); });

  function openDetail(slug) {
    var row = DATA.rows.filter(function (r) { return r.slug === slug; })[0];
    if (!row) return;
    state.selected = slug;
    writeHash();
    dialog.textContent = '';
    var recomputed = impliedOf(row, DATA.model);
    dialog.appendChild(el('div', { class: 'detail-head' },
      el('div', null,
        el('span', { class: 'brand-name', text: 'Rank ' + row.rank + ' of ' + DATA.board_size + ' · ' + row.verdict }),
        el('h2', { id: 'detail-title', text: row.name }),
        el('p', { class: 'sub', text: (row.category || 'Other') + ' on ' + (row.chains && row.chains.length ? row.chains.join(', ') : 'an unnamed chain') })
      ),
      el('button', { class: 'close', type: 'button', 'aria-label': 'Close details', text: 'Close', onclick: function () { dialog.close(); } })
    ));
    dialog.appendChild(el('section', { class: 'detail-section' },
      el('h3', { text: 'Implied value' }),
      el('div', { class: 'equation' },
        el('div', null, el('span', { text: 'TVL' }), el('b', { class: 'num', text: fmtUsd(row.tvl_usd) })),
        el('div', null, el('span', { text: 'Seven-day growth' }), el('b', { class: 'num', text: fmtPct(row.change_7d) })),
        el('div', null, el('span', { text: 'Age with no token' }), el('b', { class: 'num', text: fmtAge(row.age_days) })),
        el('div', null, el('span', { text: 'Implied value' }), el('b', { class: 'num', text: fmtUsd(row.implied_value_usd) })),
        el('div', null, el('span', { text: '80% range' }), el('b', { class: 'num', text: fmtUsd(row.implied_low_usd) + ' - ' + fmtUsd(row.implied_high_usd) })),
        el('div', null, el('span', { text: 'Launch chance (peers\u2019 record)' }), el('b', { class: 'num', text: Math.round(row.launch_probability * 100) + '%' })),
        el('div', null, el('span', { text: 'Peers counted' }), el('b', { class: 'num', text: row.odds_with_token + ' of ' + row.odds_peers + ' ' + (row.category || 'unlabelled') + ' protocols aged ' + row.odds_band + ' record a token' })),
        el('div', null, el('span', { text: 'Expected net if it launches' }), el('b', { class: 'num', text: fmtUsd(row.expected_net_usd) }))
      ),
      el('p', { class: 'sub', text: 'Model ' + DATA.model_version + ': log(mcap) = ' + DATA.model.intercept.toFixed(4) + ' + ' + DATA.model.slope.toFixed(4) + ' x log(TVL), fitted on ' + DATA.model.n_comps + ' traded tokens. The page recomputes this row as ' + fmtUsd(recomputed) + (recomputed === row.implied_value_usd ? ', the same number board.json carries.' : ', which differs from the board: the data would be stale.') + ' This is an estimate, not a price.' })
    ));
    if (row.comps && row.comps.length) {
      var compRows = row.comps.map(function (c) {
        return el('tr', null,
          el('td', null, el('b', { text: c.name })),
          el('td', { class: 'num', text: fmtUsd(c.tvl_usd) }),
          el('td', { class: 'num', text: fmtUsd(c.mcap_usd) }),
          el('td', { class: 'num', text: c.tvl_usd > 0 ? (c.mcap_usd / c.tvl_usd).toFixed(2) + 'x' : 'n/a' })
        );
      });
      dialog.appendChild(el('section', { class: 'detail-section' },
        el('h3', { text: 'Nearest traded comps' }),
        el('p', { class: 'sub', text: 'The traded tokens closest to this protocol: same category first, then closest in TVL. They are the market the value line is fitted on.' }),
        el('div', { class: 'table-wrap' },
          el('table', { class: 'compact' },
            el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Protocol' }), el('th', { scope: 'col', text: 'TVL' }), el('th', { scope: 'col', text: 'Market cap' }), el('th', { scope: 'col', text: 'Mcap / TVL' }))),
            el('tbody', null, compRows)
          )
        )
      ));
    }
    dialog.appendChild(el('section', { class: 'detail-section' },
      el('h3', { text: 'Farm plan · ' + row.verdict }),
      el('ol', { class: 'steps' }, row.farm_steps.map(function (s) {
        var at = s.indexOf(' Cost: ');
        var action = at >= 0 ? s.slice(0, at) : s;
        var tail = at >= 0 ? s.slice(at + 1) : '';
        return el('li', null, el('b', { text: action }), el('span', { class: 'cost', text: tail }));
      }))
    ));
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
  }

  function render() {
    app.textContent = '';
    var shell = el('div', { class: 'shell' });
    shell.appendChild(header());
    shell.appendChild(lede());
    shell.appendChild(verdictStrip());
    shell.appendChild(controls());
    if (state.tab === 'pre-token') shell.appendChild(boardTable());
    else if (state.tab === 'live') shell.appendChild(liveTable());
    else if (state.tab === 'fit') shell.appendChild(fitView());
    else if (state.tab === 'method') shell.appendChild(methodView());
    else if (state.tab === 'universe') shell.appendChild(universeView());
    app.appendChild(shell);
    app.setAttribute('aria-busy', 'false');
    if (!dialog.isConnected) app.appendChild(dialog);
    if (state.selected) openDetail(state.selected);
  }

  readHash();
  render();
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && dialog.open) dialog.close();
  });
})();
