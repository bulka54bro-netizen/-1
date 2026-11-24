/* ============================================================================
   ЕГЭ-НАВИГАТОР · ЛОГИКА СТРАНИЦЫ
   Меню, активный пункт при прокрутке, анимация появления, чек-лист недели,
   графики Chart.js. Данные графиков — в файле chart-data.js.
   ============================================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var header = document.getElementById('siteHeader');
  var nav = document.getElementById('primaryNav');
  var navToggle = document.getElementById('navToggle');
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav__link'));
  var sections = ['about', 'resources', 'compare', 'plan', 'results', 'survey']
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);

  /* ---------------------------------------------------------------- Шапка */
  var lastScroll = -1;
  function onScroll() {
    if (window.scrollY === lastScroll) return;
    lastScroll = window.scrollY;
    if (header) header.classList.toggle('is-stuck', window.scrollY > 8);
    updateActiveLink();
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ------------------------------------------------------- Мобильное меню */
  function setMenu(open) {
    if (!nav || !navToggle) return;
    nav.classList.toggle('is-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    var label = navToggle.querySelector('.nav-toggle__label');
    if (label) label.textContent = open ? 'Закрыть' : 'Меню';
  }

  if (navToggle && nav) {
    navToggle.addEventListener('click', function () {
      setMenu(!nav.classList.contains('is-open'));
    });
    nav.addEventListener('click', function (event) {
      if (event.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && nav.classList.contains('is-open')) {
        setMenu(false);
        navToggle.focus();
      }
    });
    document.addEventListener('click', function (event) {
      if (!nav.classList.contains('is-open')) return;
      if (nav.contains(event.target) || navToggle.contains(event.target)) return;
      setMenu(false);
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 900) setMenu(false);
    });
  }

  /* --------------------------------------- Активный пункт меню при скролле */
  function updateActiveLink() {
    if (!sections.length) return;
    var offset = (header ? header.offsetHeight : 68) + 40;
    var current = null;
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].getBoundingClientRect().top - offset <= 0) current = sections[i].id;
    }
    navLinks.forEach(function (link) {
      var isActive = !!current && link.getAttribute('href') === '#' + current;
      link.classList.toggle('is-active', isActive);
      if (isActive) {
        link.setAttribute('aria-current', 'true');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  /* -------------------------------------------------- Появление блоков */
  var revealNodes = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if (revealNodes.length) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
      revealNodes.forEach(function (node) { node.classList.add('is-visible'); });
    } else {
      // небольшая задержка для карточек в одной сетке
      revealNodes.forEach(function (node) {
        var siblings = node.parentElement
          ? Array.prototype.filter.call(node.parentElement.children, function (child) {
              return child.classList.contains('reveal');
            })
          : [];
        var index = siblings.indexOf(node);
        if (index > 0) node.style.transitionDelay = Math.min(index, 3) * 55 + 'ms';
      });

      var revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

      revealNodes.forEach(function (node) { revealObserver.observe(node); });
    }
  }

  /* Если пользователь прыгнул по якорю — показываем блок сразу, без «пустого экрана» */
  function revealNow(root) {
    if (!root) return;
    Array.prototype.forEach.call(root.querySelectorAll('.reveal'), function (node) {
      node.classList.add('is-visible');
    });
  }

  document.addEventListener('click', function (event) {
    var link = event.target.closest ? event.target.closest('a[href^="#"]') : null;
    if (!link) return;
    var id = link.getAttribute('href').slice(1);
    if (id) revealNow(document.getElementById(id));
  });

  if (window.location.hash.length > 1) {
    revealNow(document.getElementById(window.location.hash.slice(1)));
  }

  /* ---------------------------------------------------- Чек-лист недели */
  var STORAGE_KEY = 'ege-navigator-plan-v1';
  var planList = document.getElementById('planList');
  var planFill = document.getElementById('planFill');
  var planCount = document.getElementById('planCount');
  var planBar = document.getElementById('planBar');
  var planReset = document.getElementById('planReset');
  var planBox = document.querySelector('.plan');

  function readChecked() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function writeChecked(list) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (error) {
      /* приватный режим или file:// — просто не сохраняем */
    }
  }

  function renderPlan() {
    if (!planList) return;
    var inputs = Array.prototype.slice.call(planList.querySelectorAll('.day__input'));
    var done = inputs.filter(function (input) { return input.checked; }).length;
    var total = inputs.length;
    var percent = total ? Math.round((done / total) * 100) : 0;

    if (planFill) planFill.style.width = percent + '%';
    if (planCount) planCount.textContent = done + ' из ' + total;
    if (planBar) planBar.setAttribute('aria-valuenow', String(done));
    if (planBox) planBox.classList.toggle('is-complete', done === total && total > 0);
  }

  if (planList) {
    var inputs = Array.prototype.slice.call(planList.querySelectorAll('.day__input'));
    var saved = readChecked();

    inputs.forEach(function (input) {
      var day = input.getAttribute('data-day');
      input.checked = saved.indexOf(day) !== -1;
      input.addEventListener('change', function () {
        var current = inputs
          .filter(function (item) { return item.checked; })
          .map(function (item) { return item.getAttribute('data-day'); });
        writeChecked(current);
        renderPlan();
      });
    });

    if (planCount) planCount.setAttribute('aria-live', 'polite');

    if (planReset) {
      planReset.addEventListener('click', function () {
        inputs.forEach(function (input) { input.checked = false; });
        writeChecked([]);
        renderPlan();
      });
    }

    renderPlan();
  }

  /* ------------------------------------------------------------- Графики */
  var data = window.EGE_DATA;
  var CHART_COLORS = ['#1e3a8a', '#3b82f6', '#93c5fd', '#16a34a', '#86efac', '#cbd5e1'];
  var hasChart = typeof window.Chart !== 'undefined';

  function chartFallback(canvasId, label) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    var box = canvas.parentElement;
    box.innerHTML = '<div class="chart-fallback">График «' + label + '» не загрузился.<br>' +
      'Проверьте файл assets/vendor/chart.umd.min.js</div>';
  }

  if (!hasChart) {
    [['chartFipi', 'Знают ли про ФИПИ'], ['chartMoney', 'Траты на подготовку'],
     ['chartHard', 'Главные трудности'], ['chartReady', 'Готовность пользоваться сайтом']]
      .forEach(function (pair) { chartFallback(pair[0], pair[1]); });
    return;
  }

  var Chart = window.Chart;
  Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
  Chart.defaults.font.size = 12;
  Chart.defaults.color = '#5b6b87';
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.boxWidth = 8;
  Chart.defaults.plugins.legend.labels.boxHeight = 8;
  Chart.defaults.plugins.legend.labels.padding = 14;
  Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(19, 31, 56, .94)';
  Chart.defaults.plugins.tooltip.padding = 10;
  Chart.defaults.plugins.tooltip.cornerRadius = 8;
  Chart.defaults.plugins.tooltip.titleFont = { weight: '600' };

  var baseAnimation = reduceMotion ? false : { duration: 900, easing: 'easeOutQuart' };

  var legendBottom = {
    position: 'bottom',
    labels: { boxWidth: 8, boxHeight: 8, padding: 12, font: { size: 11.5 } }
  };

  var tooltipPercent = {
    callbacks: {
      label: function (context) {
        var unit = context.dataset.unit || '';
        return ' ' + context.label + ': ' + context.formattedValue + (unit === '%' ? ' %' : ' ' + unit);
      }
    }
  };

  /* Центральная подпись для кольцевой диаграммы */
  var centerText = {
    id: 'centerText',
    afterDraw: function (chart) {
      if (chart.config.type !== 'doughnut' || !chart.chartArea) return;
      var ctx = chart.ctx;
      var area = chart.chartArea;
      var cx = (area.left + area.right) / 2;
      var cy = (area.top + area.bottom) / 2;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#0f1b33';
      ctx.font = '700 26px ' + Chart.defaults.font.family;
      var total = (window.EGE_DATA && window.EGE_DATA.meta && window.EGE_DATA.meta.sampleSize) || 68;
      ctx.fillText(String(total), cx, cy - 8);
      ctx.fillStyle = '#5b6b87';
      ctx.font = '500 12px ' + Chart.defaults.font.family;
      ctx.fillText('опрошенных', cx, cy + 16);
      ctx.restore();
    }
  };

  /* 1. Кольцевая — знают ли про ФИПИ */
  if (data && data.knowFipi && document.getElementById('chartFipi')) {
    new Chart(document.getElementById('chartFipi'), {
      type: 'doughnut',
      data: {
        labels: data.knowFipi.labels,
        datasets: [{
          data: data.knowFipi.values,
          backgroundColor: ['#1e3a8a', '#3b82f6', '#cbd5e1'],
          borderColor: '#ffffff',
          borderWidth: 3,
          hoverOffset: 6,
          unit: data.knowFipi.unit
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        layout: { padding: 4 },
        animation: baseAnimation,
        plugins: {
          legend: legendBottom,
          tooltip: tooltipPercent
        }
      },
      plugins: [centerText]
    });
  }

  /* 2. Столбчатая — траты в месяц */
  if (data && data.money && document.getElementById('chartMoney')) {
    new Chart(document.getElementById('chartMoney'), {
      type: 'bar',
      data: {
        labels: data.money.labels,
        datasets: [{
          data: data.money.values,
          backgroundColor: '#3b82f6',
          hoverBackgroundColor: '#1e3a8a',
          borderRadius: 8,
          maxBarThickness: 54,
          unit: data.money.unit
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: baseAnimation,
        layout: { padding: { top: 8 } },
        plugins: {
          legend: { display: false },
          tooltip: tooltipPercent
        },
        scales: {
          x: {
            grid: { display: false },
            border: { color: '#e4eaf3' },
            ticks: { font: { size: 11 }, maxRotation: 0, autoSkip: false }
          },
          y: {
            beginAtZero: true,
            suggestedMax: Math.max.apply(null, data.money.values) * 1.15,
            grid: { color: '#eef2f8' },
            border: { display: false },
            ticks: { precision: 0, font: { size: 11 } }
          }
        }
      }
    });
  }

  /* 3. Горизонтальная — главные трудности */
  if (data && data.hard && document.getElementById('chartHard')) {
    new Chart(document.getElementById('chartHard'), {
      type: 'bar',
      data: {
        labels: data.hard.labels,
        datasets: [{
          data: data.hard.values,
          backgroundColor: '#3b82f6',
          hoverBackgroundColor: '#1e3a8a',
          borderRadius: 7,
          maxBarThickness: 30,
          unit: data.hard.unit
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        animation: baseAnimation,
        plugins: {
          legend: { display: false },
          tooltip: tooltipPercent
        },
        scales: {
          x: {
            beginAtZero: true,
            suggestedMax: Math.max.apply(null, data.hard.values) * 1.2,
            grid: { color: '#eef2f8' },
            border: { display: false },
            ticks: { precision: 0, font: { size: 11 } }
          },
          y: {
            grid: { display: false },
            border: { color: '#e4eaf3' },
            ticks: { font: { size: 11.5 } }
          }
        }
      }
    });
  }

  /* 4. Круговая — готовность пользоваться сайтом */
  if (data && data.ready && document.getElementById('chartReady')) {
    new Chart(document.getElementById('chartReady'), {
      type: 'pie',
      data: {
        labels: data.ready.labels,
        datasets: [{
          data: data.ready.values,
          backgroundColor: ['#16a34a', '#86efac', '#93c5fd', '#cbd5e1'],
          borderColor: '#ffffff',
          borderWidth: 3,
          hoverOffset: 6,
          unit: data.ready.unit
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: 4 },
        animation: baseAnimation,
        plugins: {
          legend: legendBottom,
          tooltip: tooltipPercent
        }
      }
    });
  }
})();
