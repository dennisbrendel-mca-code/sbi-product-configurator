/* eslint-disable */
// @ts-nocheck
/**
 * ─────────────────────────────────────────────────────────────────────────────
 * OVERGANGSBESTAND — fase 1
 *
 * Dit is de UI-code van v1.8, letterlijk overgenomen, met één wijziging: het
 * rekenhart is eruit gehaald en vervangen door aanroepen naar `src/domain`.
 * Zo staat vast dat de herbouwde berekening zich in de échte applicatie net zo
 * gedraagt als in de tests.
 *
 * Alles wat hier lelijk is — 94 inline onclick-attributen, globale functies,
 * DOM als datastore — is bewust ongemoeid gelaten. Dat is fase 2.
 *
 * GENEREER OPNIEUW MET:  node scripts/wire-legacy.mjs
 * Handmatige wijzigingen in dit bestand gaan bij de volgende run verloren.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { RAILS as DOMAIN_RAILS } from '../domain/catalog.rails';
import { calcAutoG } from '../domain/pitch';
import {
  computeParts,
  autoNumParts,
  findSuggestions,
  findLengthSuggestions,
} from '../domain/coupling';
import { buildOrderCode, fromLegacySelections } from '../domain/ordercode';

// ── Adapters: zelfde signatuur als v1.8, implementatie uit het domein ────────

/** v1.8 las RAILS[20].F etc.; het domein levert dezelfde velden plus `size`. */
const RAILS = DOMAIN_RAILS;

const cpCalcAutoG = (totalLen, F, Gmin) => calcAutoG(totalLen, F, Gmin).G;
const cpCalcAutoGDetailed = (totalLen, F, Gmin) => calcAutoG(totalLen, F, Gmin);

const cpComputeParts = (totalLen, G1, G2, F, K, maxL, minLast, numParts) =>
  computeParts({ totalLen, G1, G2, F, K, maxL, minLast }, numParts);

const cpAutoNumParts = (totalLen, G1, G2, F, K, maxL, minLast) =>
  autoNumParts({ totalLen, G1, G2, F, K, maxL, minLast });

const cpFindSuggestions = (desired, G1, G2, F, K, maxL, minLast, count = 5) =>
  findSuggestions({ totalLen: desired, G1, G2, F, K, maxL, minLast }, count);

const step9FindSuggestions = (desired, F, Gmin, maxL, count = 6) =>
  findLengthSuggestions(desired, F, Gmin, maxL, count);

/** v1.8 bouwde de code uit stapnummers; het domein werkt met veldnamen. */
const buildCode = () => buildOrderCode(fromLegacySelections(selections));

// ── Hieronder: ongewijzigde UI-code uit v1.8 ────────────────────────────────

/* ══════════════════════════════════════════════════════════════
           Bestaande wizard-logica (ongewijzigd)
           ══════════════════════════════════════════════════════════════ */
        const TOTAL_STEPS = 15;
        const selections = {};
        const labels = {};
        const bdMap = { 1: 'bd1', 2: 'bd2', 4: 'bd4', 5: 'bd5', 7: 'bd7', 8: 'bd8', 12: 'bd12', 13: 'bd13', 14: 'bd14', 15: 'bd15' };
        let carriageSkipped = false; // true zodra 'geen loopwagen' gekozen is (stap 3–8 overgeslagen)
        let defaultsApplied = false; // true zodra de klant voor het eerst iets invult/selecteert

        // Past de voorselecties (stap 3,4,5,7,8,10,11,12,15) pas toe bij de EERSTE
        // daadwerkelijke interactie van de klant — niet automatisch bij het laden/verversen
        // van de pagina. Zo staan voortgang, bestelcode en specificatieoverzicht op 0
        // totdat de klant zelf begint met configureren.
        function ensureDefaultsApplied() {
            if (defaultsApplied) return;
            defaultsApplied = true;
            preselectDefaults();
        }

        function select(step, code, label, btn) {
            ensureDefaultsApplied();
            // Als eerder 'geen loopwagen' gekozen was en nu bij stap 2 alsnog een echt Loopwagen
            // gekozen wordt, herstel stap 3–8 dan naar 'nog niet geselecteerd'.
            if (step === 2 && code !== '' && carriageSkipped) {
                restoreCarriageSteps();
            }
            selections[step] = code;
            labels[step] = label;
            const body = document.querySelector('#step' + step + ' .step-body');
            body.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            document.getElementById('next' + step).disabled = false;
            document.getElementById('sel' + step).textContent = label;
            if (bdMap[step]) {
                document.getElementById(bdMap[step]).textContent = code || 'Standaard';
            }
            updateCode();
            updateProgress();
            if (step === 1) cpOnModelChange();
            updateIllustration();
        }

        // ── 'Geen loopwagen' — alleen railconfiguratie: slaat stap 3 t/m 8 over ──
        function selectNoCarriage(btn) {
            select(2, '', 'Geen loopwagen – alleen railconfiguratie', btn);
            skipCarriageSteps();
        }

        function skipCarriageSteps() {
            carriageSkipped = true;
            [3, 4, 5, 6, 7, 8, 9].forEach(s => {
                selections[s] = '';
                labels[s] = 'N.v.t. (geen loopwagen)';
                const selEl = document.getElementById('sel' + s);
                if (selEl) selEl.textContent = 'N.v.t. (geen loopwagen)';
                const nextBtn = document.getElementById('next' + s);
                if (nextBtn) nextBtn.disabled = false;
                const card = document.getElementById('step' + s);
                if (card) { card.classList.remove('active'); card.classList.add('done'); }
                const opts = document.querySelectorAll('#step' + s + ' .opt-btn');
                opts.forEach(b => b.classList.remove('selected'));
            });
            ['bd2', 'bd4', 'bd5', 'bd7', 'bd8'].forEach(id => { document.getElementById(id).textContent = 'n.v.t.'; });

            const step2card = document.getElementById('step2');
            step2card.classList.remove('active');
            step2card.classList.add('done');
            const stepAfterCard = document.getElementById('step10');
            stepAfterCard.classList.add('active');
            setTimeout(() => stepAfterCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);

            updateCode();
            updateProgress();
            updateIllustration();
        }

        function restoreCarriageSteps() {
            carriageSkipped = false;
            [3, 4, 5, 6, 7, 8, 9].forEach(s => {
                delete selections[s];
                delete labels[s];
                const selEl = document.getElementById('sel' + s);
                if (selEl) selEl.textContent = 'Nog niet geselecteerd';
                const nextBtn = document.getElementById('next' + s);
                if (nextBtn) nextBtn.disabled = true;
                const card = document.getElementById('step' + s);
                if (card) card.classList.remove('done');
                const opts = document.querySelectorAll('#step' + s + ' .opt-btn');
                opts.forEach(b => b.classList.remove('selected'));
            });
            ['bd4', 'bd5', 'bd7', 'bd8'].forEach(id => { document.getElementById(id).textContent = '–'; });
            updateCode();
            updateProgress();
            updateIllustration();
        }

        function onLengthInput() {
            ensureDefaultsApplied();
            const val = document.getElementById('lengthInput').value;
            if (val && parseInt(val) >= 100) {
                selections[12] = val;
                labels[12] = val + ' mm';
                document.getElementById('sel12').textContent = val + ' mm';
                document.getElementById('bd12').textContent = val + ' mm';
            } else {
                delete selections[12];
            }
            updateCode();
            updateProgress();
            cpUpdateCoupling();
            updateIllustration();
            updateLengthSuggestions();
            syncStep13FromLength();
        }

        // ── Info + suggesties bij stap 9 (alleen relevant zolang niet gekoppeld hoeft te worden) ──


        function applyLengthSuggestion(len) {
            document.getElementById('lengthInput').value = len;
            onLengthInput();
        }

        function updateLengthSuggestions() {
            const infoBox = document.getElementById('step12Info');
            const sugWrap = document.getElementById('step12SugWrap');
            const sugList = document.getElementById('step12SugList');

            const type = cpGetRailType();
            const rail = type ? RAILS[type] : null;
            const val = +document.getElementById('lengthInput').value;

            if (!rail || !val || val <= 0 || val > rail.maxL) {
                infoBox.style.display = 'none';
                sugWrap.style.display = 'none';
                return;
            }

            const { G, n } = cpCalcAutoGDetailed(val, rail.F, rail.Gmin);
            infoBox.style.display = 'block';
            infoBox.innerHTML = `Bij deze lengte: G1 = G2 = <strong>${G} mm</strong> (automatisch, ${n + 1} gaten). Dit wordt al ingevuld bij stap 13.`;

            const sugs = step9FindSuggestions(val, rail.F, rail.Gmin, rail.maxL, 6);
            if (!sugs.length) { sugWrap.style.display = 'none'; return; }
            sugWrap.style.display = 'block';
            sugList.innerHTML = '';
            sugs.forEach((s, i) => {
                const sign = s.delta > 0 ? '+' : '';
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'wizard-sug-pill' + (i === 0 ? ' best' : '');
                btn.textContent = `${s.len} mm (${sign}${s.delta}) · G=${s.G}`;
                btn.onclick = () => applyLengthSuggestion(s.len);
                sugList.appendChild(btn);
            });
        }

        // ── Stap 13 automatisch voorinvullen met de correcte G1/G2 voor de opgegeven lengte ──
        function syncStep13FromLength() {
            if (cpCouplingActive) return; // bij koppeling regelt stap 12B / de vergrendeling dit zelf
            const type = cpGetRailType();
            const rail = type ? RAILS[type] : null;
            const val = +document.getElementById('lengthInput').value;
            if (!rail || !val || val <= 0 || val > rail.maxL) return;

            const { G } = cpCalcAutoGDetailed(val, rail.F, rail.Gmin);
            document.getElementById('pitchFirst').value = G;
            document.getElementById('pitchLast').value = G;
            onPitchInput();
        }

        function onPitchInput() {
            ensureDefaultsApplied();
            const f = document.getElementById('pitchFirst').value;
            const l = document.getElementById('pitchLast').value;
            const alertBox = document.getElementById('pitchAlertBox');

            const type = cpGetRailType();
            const rail = type ? RAILS[type] : null;
            const totalLen = +(document.getElementById('lengthInput').value || 0);

            function invalidate(msgHtml, selText, bdText) {
                alertBox.innerHTML = msgHtml;
                alertBox.className = 'wizard-alert wizard-alert-err show';
                document.getElementById('next13').disabled = true;
                document.getElementById('sel13').textContent = selText;
                document.getElementById('bd13').textContent = bdText;
                delete selections[13];
                updateCode();
                updateProgress();
            }

            if (f && l) {
                const fn = +f, ln = +l;

                // Ongeldig/onlogisch getal (leeg, geen getal, nul of negatief)
                if (!isFinite(fn) || !isFinite(ln) || fn <= 0 || ln <= 0) {
                    invalidate(
                        `⚠ Vul voor beide gaten een geldig getal groter dan 0 in.`,
                        'Ongeldig getal', 'Ongeldig getal'
                    );
                    return;
                }

                if (rail && (fn < rail.Gmin || ln < rail.Gmin)) {
                    invalidate(
                        `⚠ Eerste gat (${fn} mm) en/of laatste gat (${ln} mm) zijn kleiner dan het minimum van <strong>${rail.Gmin} mm</strong> voor SBI${type}. Dit is niet toegestaan.` +
                        `<br><div style="margin-top:9px;display:flex;flex-wrap:wrap;gap:8px">` +
                        `<button type="button" class="wizard-fix-btn" onclick="pitchApplyMinG(${rail.Gmin})">Zet op minimum (${rail.Gmin} mm)</button>` +
                        `</div>`,
                        'Ongeldig — kleiner dan minimum (' + rail.Gmin + ' mm)', 'Ongeldig (< ' + rail.Gmin + ' mm)'
                    );
                    return;
                }

                // Controleer of dit gatenpatroon (steek F) daadwerkelijk exact past op de opgegeven raillengte
                if (rail && totalLen > 0 && totalLen <= rail.maxL) {
                    const nSingle = (totalLen - fn - ln) / rail.F;
                    if (nSingle < 0 || Math.abs(nSingle - Math.round(nSingle)) > 1e-6) {
                        const auto = cpCalcAutoGDetailed(totalLen, rail.F, rail.Gmin);
                        invalidate(
                            `⚠ Met G1=${fn} mm en G2=${ln} mm past het boutgatpatroon (steek F=${rail.F} mm) niet exact op een raillengte van ${totalLen} mm.` +
                            `<br><div style="margin-top:9px;display:flex;flex-wrap:wrap;gap:8px">` +
                            `<button type="button" class="wizard-fix-btn" onclick="pitchApplyExact(${auto.G})">Gebruik correcte waarde (${auto.G} mm)</button>` +
                            `</div>`,
                            'Ongeldig — patroon past niet op raillengte', 'Ongeldig (patroon past niet)'
                        );
                        return;
                    }
                }
            }

            alertBox.className = 'wizard-alert';
            alertBox.innerHTML = '';

            if (f && l) {
                const code = f + '/' + l;
                selections[13] = code;
                labels[13] = code + ' mm';
                document.getElementById('next13').disabled = false;
                document.getElementById('sel13').textContent = code + ' mm';
                document.getElementById('bd13').textContent = code + ' mm';
            } else {
                document.getElementById('next13').disabled = true;
                delete selections[13];
            }
            updateCode();
            updateProgress();
        }

        function pitchApplyExact(val) {
            document.getElementById('pitchFirst').value = val;
            document.getElementById('pitchLast').value = val;
            onPitchInput();
        }

        function pitchApplyMinG(minVal) {
            const f = document.getElementById('pitchFirst');
            const l = document.getElementById('pitchLast');
            if (!f.value || +f.value < minVal) f.value = minVal;
            if (!l.value || +l.value < minVal) l.value = minVal;
            onPitchInput();
        }

        function onQtyInput() {
            ensureDefaultsApplied();
            const val = document.getElementById('qtyInput').value;
            if (val && parseInt(val) >= 1) {
                const n = parseInt(val);
                selections[15] = val;
                labels[15] = n + (n === 1 ? ' set' : ' sets');
                document.getElementById('next15').disabled = false;
                document.getElementById('sel15').textContent = labels[15];
                document.getElementById('bd15').textContent = labels[15];
            } else {
                document.getElementById('next15').disabled = true;
                delete selections[15];
            }
            updateCode();
            updateProgress();
        }

        // ── Voorselecties — worden pas toegepast bij de EERSTE interactie van de klant ──
        // (via ensureDefaultsApplied), niet automatisch bij het laden/verversen van de pagina.
        // Stap 3,4,5,8,11,12 -> standaard (geen symbool, 1e optie)
        // Stap 7 -> K1 Normaal (voorkeurstype, 2e optie)
        // Stap 10 -> H Hoog (voorkeurstype, enige overgebleven standaardoptie)
        // Stap 15 -> Aantal configuraties, standaard 1 set
        function preselectDefaults() {
            const defaults = [
                { step: 3, idx: 0 },  // Smeernippelpositie: Voorzijde (geen symbool)
                { step: 4, idx: 0 },  // Nauwkeurigheidsklasse: H Hoog (voorkeurstype)
                { step: 5, idx: 1 },  // Voorspanning: K1 Normaal (voorkeurstype)
                { step: 6, idx: 0 },  // Smeercontainer/smering: Standaard (geen symbool)
                { step: 7, idx: 0 },  // Afdichting: Standaard (normale condities)
                { step: 9, idx: 0 },  // Eindplaat hoge temperatuur: Standaard (geen symbool)
                { step: 10, idx: 0 }, // Oppervlaktebehandeling: Standaard (geen symbool)
                { step: 11, idx: 0 }, // Rail montage: Standaard (geen symbool)
            ];
            defaults.forEach(d => {
                const btns = document.querySelectorAll('#step' + d.step + ' .opt-btn');
                if (btns[d.idx]) btns[d.idx].click();
            });
            onQtyInput(); // registreert de standaardwaarde (1 set) uit stap 15
            updateIllustration();
        }

        // Bij het laden/verversen van de pagina: alleen de illustratie tonen (neutrale
        // voorbeeldweergave). Voortgang, bestelcode en specificatieoverzicht blijven op 0
        // totdat de klant zelf iets invult of selecteert.
        

        // ── Dynamische sidebar-illustratie: matcht loopwagens/rail en rails/as ──
        function getNumWagons() {
            const v = selections[8];
            if (v === undefined || v === '') return 1;
            const n = parseInt(v, 10);
            return (n >= 1 && n <= 4) ? n : 1;
        }

        function getNumRails() {
            const v = selections[14];
            const map = { 'II': 2, 'III': 3, 'IV': 4 };
            return map[v] || 1;
        }

        function wagonPositions(n, railX, railW, wagonW) {
            const margin = 55; // blijf uit de buurt van de eindkappen
            const usableStart = railX + margin;
            const usableEnd = railX + railW - margin;
            if (n <= 1) return [(usableStart + usableEnd) / 2];
            const positions = [];
            for (let i = 0; i < n; i++) {
                const t = i / (n - 1);
                positions.push(usableStart + t * (usableEnd - usableStart));
            }
            return positions;
        }

        function updateIllustration() {
            const svg = document.getElementById('illustrationSvg');
            if (!svg) return;

            const numWagons = getNumWagons();
            const numRails = getNumRails();
            const hasWagon = selections[2] !== '';
            const lenInput = document.getElementById('lengthInput');
            const lenVal = lenInput ? lenInput.value : '';

            const railX = 10, railW = 320;
            const capW = 18, capH = 40, capY0 = 27, rowStride = 74;
            const wagonSizes = { 1: { w: 84, h: 54 }, 2: { w: 60, h: 50 }, 3: { w: 46, h: 46 }, 4: { w: 36, h: 42 } };
            const wSize = wagonSizes[numWagons] || wagonSizes[1];

            let html = '';

            for (let r = 0; r < numRails; r++) {
                const dy = r * rowStride;
                const capY = capY0 + dy;
                const baseY = 32 + dy;
                const grooveY = 39 + dy;
                const holeY = 47 + dy;
                const centerY = baseY + 15;

                html += `<rect x="${railX}" y="${baseY}" width="${railW}" height="30" rx="4" fill="#e8edf5" stroke="#0c2c65" stroke-width="1.5"/>`;
                html += `<rect x="${railX}" y="${grooveY}" width="${railW}" height="16" rx="2" fill="#c8d2e8"/>`;
                html += `<rect x="${railX}" y="${capY}" width="${capW}" height="${capH}" rx="3" fill="#0c2c65"/>`;
                html += `<rect x="${railX + railW - capW}" y="${capY}" width="${capW}" height="${capH}" rx="3" fill="#0c2c65"/>`;
                [railX + 30, railX + 72, railX + railW - 72, railX + railW - 30].forEach(hx => {
                    html += `<circle cx="${hx}" cy="${holeY}" r="4" fill="white" stroke="#0c2c65" stroke-width="1"/>`;
                });

                if (hasWagon) {
                    wagonPositions(numWagons, railX, railW, wSize.w).forEach(cx => {
                        const wx = cx - wSize.w / 2;
                        const wy = centerY - wSize.h / 2;
                        const dotOffX = wSize.w * 0.24;
                        const dotOffY = wSize.h * 0.185;
                        html += `<rect x="${wx}" y="${wy}" width="${wSize.w}" height="${wSize.h}" rx="5" fill="#0c2c65"/>`;
                        html += `<rect x="${wx + 8}" y="${wy + 8}" width="${wSize.w - 16}" height="${wSize.h - 16}" rx="3" fill="#1a4080"/>`;
                        html += `<circle cx="${cx - dotOffX}" cy="${centerY - dotOffY}" r="3" fill="#be0068"/>`;
                        html += `<circle cx="${cx + dotOffX}" cy="${centerY - dotOffY}" r="3" fill="#be0068"/>`;
                        html += `<circle cx="${cx - dotOffX}" cy="${centerY + dotOffY}" r="3" fill="#be0068"/>`;
                        html += `<circle cx="${cx + dotOffX}" cy="${centerY + dotOffY}" r="3" fill="#be0068"/>`;
                        if (wSize.w >= 80) {
                            html += `<text x="${cx}" y="${centerY + 2}" text-anchor="middle" font-family="Fugue,Trebuchet MS" font-size="9" font-weight="700" fill="white" letter-spacing="0.5">LOOPWAGEN</text>`;
                        }
                    });
                }
            }

            const lastCapBottom = capY0 + (numRails - 1) * rowStride + capH;
            const dashY = lastCapBottom + 13;
            const textY = lastCapBottom + 24;

            html += `<line x1="${railX}" y1="${dashY}" x2="${railX + railW}" y2="${dashY}" stroke="#be0068" stroke-width="1" stroke-dasharray="3,2"/>`;
            const lenText = lenVal ? ('Lengte: ' + lenVal + ' mm') : 'Lengte: – mm';
            html += `<text x="${railX + railW / 2}" y="${textY}" text-anchor="middle" font-family="Fugue,Trebuchet MS" font-size="10" fill="#be0068" font-weight="600">${lenText}</text>`;

            // Korte samenvatting onder de lengte, alleen als het afwijkt van de standaard (1 loopwagen, 1 rail)
            let captionParts = [];
            if (!hasWagon) captionParts.push('Geen loopwagen');
            else if (numWagons > 1) captionParts.push(numWagons + '× loopwagen per rail');
            if (numRails > 1) captionParts.push(numRails + ' rails parallel');
            let totalH = textY + 6;
            if (captionParts.length) {
                const capTextY = textY + 13;
                html += `<text x="${railX + railW / 2}" y="${capTextY}" text-anchor="middle" font-family="Fugue,Trebuchet MS" font-size="9" fill="#6b7594" font-weight="500">${captionParts.join(' · ')}</text>`;
                totalH = capTextY + 6;
            }

            svg.setAttribute('viewBox', `0 0 340 ${totalH}`);
            svg.innerHTML = html;
        }

        // ── Stap 13 vergrendelen wanneer G1/G2 in stap 12B op automatisch staat ──
        function cpUpdateStep13Lock() {
            const wrap = document.getElementById('pitchInputsWrap');
            const notice = document.getElementById('pitchLockedNotice');
            const desc = document.getElementById('step13Desc');
            const locked = cpCouplingActive && cpGMode === 'auto' && cpValid;

            if (locked) {
                wrap.style.display = 'none';
                notice.style.display = 'block';
                const val = cpLastG1 + '/' + cpLastG2;
                document.getElementById('pitchLockedValue').textContent = val + ' mm';
                selections[13] = val;
                labels[13] = val + ' mm';
                document.getElementById('sel13').textContent = val + ' mm (stap 12B)';
                document.getElementById('bd13').textContent = val + ' mm (stap 12B)';
                document.getElementById('next13').disabled = false;
                desc.textContent = 'Automatisch overgenomen van stap 12B: G1/G2 staat daar op automatisch, dus deze waarde kan hier niet los aangepast worden.';
            } else {
                wrap.style.display = '';
                notice.style.display = 'none';
                desc.textContent = 'Afstand van het eerste en laatste bevestigingsgat tot het railuiteinde in mm (bv. 20/20).';
                onPitchInput(); // herstel op basis van de daadwerkelijke invoervelden
            }
            updateCode();
            updateProgress();
        }

        function toggleStep(step) {
            const card = document.getElementById('step' + step);
            const isActive = card.classList.contains('active');
            document.querySelectorAll('.step-card').forEach(c => c.classList.remove('active'));
            if (!isActive) card.classList.add('active');
        }

        function goNext(step) {
            const card = document.getElementById('step' + step);
            card.classList.remove('active');
            card.classList.add('done');
            const next = document.getElementById('step' + (step + 1));
            if (next) {
                next.classList.add('active');
                setTimeout(() => next.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
            }
        }



        function updateCode() {
            const code = buildCode();
            const display = document.getElementById('codeDisplay');
            if (!code) {
                display.innerHTML = '<span class="code-part empty">– – –</span>';
                return;
            }
            display.innerHTML = code.split('-').map((p, i, arr) =>
                '<span class="code-part">' + p + '</span>' + (i < arr.length - 1 ? '<span class="code-separator">·</span>' : '')
            ).join('');
        }

        function updateProgress() {
            const filled = Object.keys(selections).length;
            const pct = Math.round((filled / TOTAL_STEPS) * 100);
            document.getElementById('progressFill').style.width = pct + '%';
            document.getElementById('progressPct').textContent = pct + '%';
            const allDone = filled >= TOTAL_STEPS;
            document.getElementById('requestBtn').disabled = !allDone;
            document.getElementById('ctaIncomplete').style.display = allDone ? 'none' : 'block';
        }

        function copyCode() {
            const code = buildCode();
            if (!code) return;
            navigator.clipboard.writeText(code).then(() => {
                const btn = document.querySelector('.code-copy-btn');
                const orig = btn.innerHTML;
                btn.innerHTML = '✓ Gekopieerd!';
                setTimeout(() => { btn.innerHTML = orig; }, 2000);
            });
        }

        function sendRequest() {
            const code = buildCode();
            let couplingBlock = '';
            if (cpCouplingActive && cpLastParts) {
                couplingBlock = '\n\nKoppelverdeling (rail overschrijdt catalogus max. handelslengte, automatisch opgesplitst):\n' + cpBuildBreakdownText();
                cpDownloadSvgAsPng();
                document.getElementById('ctaPngNotice').style.display = 'block';
                couplingBlock += '\n\n[Zie bijgevoegde afbeelding: rail-koppelverdeling.png voor de visualisatie — voeg deze toe als bijlage aan de mail.]';
            }

            const lines = [
                'Model: ' + (selections[1] || '–'),
                'Loopwagen: ' + (selections[2] || '–'),
                'Smeernippel: ' + (selections[3] || 'Voorkant standaard'),
                'Smeercontainer: ' + (selections[6] || 'Standaard'),
                'Afdichting: ' + (selections[7] || 'Standaard'),
                'Loopwagens/rail: ' + (selections[8] || 'Standaard'),
                'Voorspanning: ' + (selections[5] || '–'),
                'Eindplaat: ' + (selections[9] || 'Standaard'),
                'Raillengte: ' + (selections[12] || '–') + ' mm' + (cpCouplingActive ? ' (gekoppeld, zie koppelverdeling onder)' : ''),
                'Nauwkeurigheid: ' + (selections[4] || '–'),
                'Oppervlak: ' + (selections[10] || 'Standaard'),
                'Rail montage: ' + (selections[11] || 'Standaard'),
                'Steek: ' + (selections[13] || '–') + ' mm',
                'Rails per as: ' + (selections[14] || '1'),
            ].join('\n');

            const subject = encodeURIComponent('Offerte aanvraag SBI profielrailgeleiding \u2013 ' + code);
            const body = encodeURIComponent(
                'Geachte MCA-team,\n\nHierbij vraag ik een offerte aan voor de volgende profielrailgeleiding:\n\nBestelcode: ' + code + '\n\nSpecificaties:\n' + lines + couplingBlock + '\n\nAantal configuraties: ' + (selections[15] || '1') + '\n\nMet vriendelijke groet,\n[Uw naam]\n[Bedrijfsnaam]\n[Telefoonnummer / e-mail]'
            );
            window.location.href = 'mailto:linear@mcabv.nl?subject=' + subject + '&body=' + body;
        }

        /* ══════════════════════════════════════════════════════════════
           Stap 12B — Koppellogica (hergebruikt uit SBI Gekoppelde Rail
           Configurator v9.1, aangepast om de wizard-invoer (model uit
           stap 1, lengte uit stap 12) als bron te gebruiken i.p.v. eigen
           losse invoervelden). Alle functies/IDs zijn cp-geprefixt.
           ══════════════════════════════════════════════════════════════ */

        // ── Catalogusdata (SBI_Rail_maatgegevens_absoluut_26-3-26.xlsx) — identiek aan v9.1 ──


        let cpGMode = 'auto';   // 'manual' | 'auto'
        let cpMaxLEnabled = false;    // inbouwbeperking toggle
        let cpCouplingActive = false;    // true zodra lengte > catalogus max voor gekozen model
        let cpManualCouple   = false;    // true zodra klant zelf de toggle 'Zelf koppelen' heeft ingedrukt
        let cpValid = false;    // true zodra een geldige verdeling gevonden is
        let cpLastParts = null;
        let cpLastG1 = null;
        let cpLastG2 = null;
        let cpLastK = null;
        let cpLastTotal = null;

        function cpGetRailType() {
            const raw = selections[1]; // bv. 'SBI20'
            if (!raw) return null;
            const n = parseInt(raw.replace('SBI', ''), 10);
            return RAILS[n] ? n : null;
        }

        // ── Model-wissel (stap 1) ──
        function filterBlockTypes() {
            const type = cpGetRailType(); // bv. 20, 35, 45
            const notice = document.getElementById('step2FilterNotice');
            const btns = document.querySelectorAll('#step2 .opt-btn[data-models]');
            let hiddenNames = [];

            btns.forEach(btn => {
                const allowed = btn.dataset.models.split(',').map(s => s.trim());
                const visible = !type || allowed.includes(String(type));
                btn.style.display = visible ? '' : 'none';

                // Als de klant al een type had gekozen dat nu verborgen wordt: reset stap 2
                if (!visible && btn.classList.contains('selected')) {
                    btn.classList.remove('selected');
                    delete selections[2];
                    delete labels[2];
                    document.getElementById('sel2').textContent = 'Nog niet geselecteerd';
                    document.getElementById('bd2').textContent = '–';
                    document.getElementById('next2').disabled = true;
                    updateCode();
                    updateProgress();
                }

                if (!visible && type) {
                    const code = btn.querySelector('.opt-code')?.textContent;
                    if (code) hiddenNames.push(code);
                }
            });

            if (hiddenNames.length && type) {
                notice.style.display = 'block';
                notice.innerHTML = `<strong>${hiddenNames.join(', ')}</strong> ${hiddenNames.length === 1 ? 'is' : 'zijn'} niet beschikbaar voor SBI${type}.`;
            } else {
                notice.style.display = 'none';
            }
        }

        function cpOnModelChange() {
            const type = cpGetRailType();
            const rail = type ? RAILS[type] : null;
            const hint = document.getElementById('lengthHint');
            if (rail) {
                hint.textContent = 'Min. 100 mm – max. handelslengte SBI' + type + ': ' + rail.maxL + ' mm (langere lengtes worden automatisch gekoppeld)';
            } else {
                hint.textContent = 'Min. 100 mm – kies eerst een model (stap 1) voor de max. handelslengte';
            }
            filterBlockTypes();
            cpResetManualCouple();
            cpUpdateCoupling();
            updateLengthSuggestions();
            syncStep13FromLength();
        }

        // ── Max deellengte toggle ──
        function cpToggleMaxL() {
            cpMaxLEnabled = !cpMaxLEnabled;
            const row = document.getElementById('cpMaxlToggleRow');
            const wrap = document.getElementById('cpMaxlInputWrap');
            const label = document.getElementById('cpMaxlLabel');
            row.classList.toggle('active', cpMaxLEnabled);
            wrap.style.display = cpMaxLEnabled ? '' : 'none';
            label.textContent = cpMaxLEnabled ? 'Aan — deellengte beperkt' : 'Uit — catalogus handelslengte geldt';
            if (cpMaxLEnabled) {
                const rail = RAILS[cpGetRailType()];
                if (rail) document.getElementById('cpMaxlHint').textContent =
                    `Alle delen blijven ≤ deze lengte. Minimum voor dit type: ${rail.minLast} mm (minLast).`;
            }
            document.getElementById('cpRMaxLUserRow').style.display = cpMaxLEnabled ? '' : 'none';
            cpCalculate();
        }

        // ── UI helpers ──
        function cpSetAlert(msg, type) {
            const el = document.getElementById('cpAlertBox');
            el.innerHTML = msg;
            el.className = 'alert show alert-' + type;
        }
        function cpClearAlert() { document.getElementById('cpAlertBox').className = 'alert'; }
        function cpSetOut(id, html, cls) {
            const el = document.getElementById(id);
            el.innerHTML = html;
            el.className = 'out-box' + (cls ? ' ' + cls : '');
        }

        // ── G-berekening ──


        // Zelfde formule als cpCalcAutoG, maar geeft ook n (aantal steek-intervallen) terug


        function cpSyncAutoG() {
            const type = cpGetRailType();
            const rail = type ? RAILS[type] : null;
            const desired = +document.getElementById('lengthInput').value;
            if (!rail || !desired) return;
            const G = cpCalcAutoG(desired, rail.F, rail.Gmin);
            document.getElementById('cpG1').value = G;
            document.getElementById('cpG2').value = G;
        }

        function cpApplyMinG(minVal) {
            const g1el = document.getElementById('cpG1');
            const g2el = document.getElementById('cpG2');
            if (+g1el.value < minVal) g1el.value = minVal;
            if (+g2el.value < minVal) g2el.value = minVal;
            cpCalculate();
        }

        function cpSetGMode(mode) {
            cpGMode = mode;
            document.getElementById('cpBtnGManual').classList.toggle('active', mode === 'manual');
            document.getElementById('cpBtnGAuto').classList.toggle('active', mode === 'auto');
            document.getElementById('cpGInputs').style.display = mode === 'manual' ? '' : 'none';
            document.getElementById('cpGAutoInfo').style.display = mode === 'auto' ? '' : 'none';
            if (mode === 'auto') cpSyncAutoG();
            cpCalculate();
            cpUpdateStep13Lock();
        }

        function cpOnPartsModeChange() {
            const manual = document.getElementById('cpNumPartsMode').value === 'manual';
            document.getElementById('cpNumPartsManual').style.display = manual ? 'block' : 'none';
            document.getElementById('cpNumPartsHint').textContent = manual
                ? 'Vul het gewenste aantal delen in'
                : 'Configurator bepaalt het minimale aantal delen';
            cpCalculate();
        }

        // ── Kernalgoritme (identiek aan v9.1) ──




        function cpApplySuggestion(len) {
            document.getElementById('lengthInput').value = len;
            onLengthInput();
        }

        function cpShowSuggestions(desired, G1, G2, F, K, maxL, minLast) {
            const sugs = cpFindSuggestions(desired, G1, G2, F, K, maxL, minLast, 6);
            const wrap = document.getElementById('cpSugWrap');
            const list = document.getElementById('cpSugList');
            if (!sugs.length) { wrap.style.display = 'none'; return; }

            wrap.style.display = 'block';
            list.innerHTML = '';
            sugs.forEach((s, i) => {
                const sign = s.delta > 0 ? '+' : '';
                const cls = i === 0 ? 'sug-pill sug-best' : s.delta < 0 ? 'sug-pill sug-shorter' : 'sug-pill';
                const btn = document.createElement('button');
                btn.className = cls;
                btn.textContent = `${s.len} mm (${sign}${s.delta}, ${s.numParts}× delen)`;
                btn.title = `Laatste deel: ${s.lastLen} mm`;
                btn.onclick = () => cpApplySuggestion(s.len);
                list.appendChild(btn);
            });
        }

        function cpHideSuggestions() {
            document.getElementById('cpSugWrap').style.display = 'none';
        }



        // ── Zichtbaarheid stap 12B ──
        function cpShowStep12b() {
            const card = document.getElementById('step12b');
            card.style.display = '';
            if (!card.classList.contains('done')) card.classList.add('active');
            document.getElementById('cpBanner').style.display = 'flex';
            document.getElementById('couplingBreakdownWrap').style.display = '';
        }

        function cpHideStep12b() {
            const card = document.getElementById('step12b');
            card.style.display = 'none';
            card.classList.remove('active', 'done');
            document.getElementById('cpBanner').style.display = 'none';
            document.getElementById('couplingBreakdownWrap').style.display = 'none';
            document.getElementById('next12b').disabled = true;
            cpValid = false;
            cpUpdateStep13Lock();
        }

        // Reset de handmatige koppel-toggle (bijv. bij model-wissel of lengte wissen)
        function cpResetManualCouple() {
            cpManualCouple = false;
            const btn = document.getElementById('toggleCoupleBtn');
            if (btn) { btn.classList.remove('active'); btn.style.display = 'none'; }
            document.getElementById('toggleCoupleBtnLabel').textContent = 'Zelf koppelen (optioneel)';
        }

        function toggleManualCouple() {
            cpManualCouple = !cpManualCouple;
            const btn   = document.getElementById('toggleCoupleBtn');
            const label = document.getElementById('toggleCoupleBtnLabel');
            if (cpManualCouple) {
                btn.classList.add('active');
                label.textContent = 'Zelf koppelen — aan (klik om uit te zetten)';
            } else {
                btn.classList.remove('active');
                label.textContent = 'Zelf koppelen (optioneel)';
            }
            cpUpdateCoupling();
        }

        // ── Hoofdorkestratie: wordt aangeroepen bij elke lengte- of modelwijziging ──
        function cpUpdateCoupling() {
            const type = cpGetRailType();
            const rail = type ? RAILS[type] : null;
            const desired = +document.getElementById('lengthInput').value;
            const toggleBtn = document.getElementById('toggleCoupleBtn');

            document.getElementById('next12').disabled = !(rail && desired && desired >= 100);

            if (!rail || !desired || desired <= 0) {
                cpCouplingActive = false;
                cpManualCouple = false;
                if (toggleBtn) { toggleBtn.style.display = 'none'; toggleBtn.classList.remove('active'); }
                document.getElementById('toggleCoupleBtnLabel').textContent = 'Zelf koppelen (optioneel)';
                cpHideStep12b();
                document.getElementById('next12').disabled = true;
                return;
            }

            const forcedCouple = desired > rail.maxL;
            const manualCouple = cpManualCouple && !forcedCouple;

            // Toggle zichtbaar zodra er een geldige lengte binnen de handelslengte is
            if (toggleBtn) toggleBtn.style.display = (desired >= 100 && !forcedCouple) ? 'flex' : 'none';

            if (!forcedCouple && !manualCouple) {
                cpCouplingActive = false;
                cpHideStep12b();
                document.getElementById('next12').disabled = false;
                return;
            }

            cpCouplingActive = true;
            document.getElementById('next12').disabled = true;

            if (forcedCouple) {
                document.getElementById('cpBannerText').textContent =
                    `Deze lengte (${desired} mm) overschrijdt de maximale handelslengte van ${rail.maxL} mm voor SBI${type}. De rail wordt automatisch opgesplitst in gekoppelde delen — vul stap 12B in om door te gaan.`;
            } else {
                document.getElementById('cpBannerText').textContent =
                    `Handmatige koppeling ingeschakeld voor ${desired} mm. Configureer de verdeling in stap 12B hieronder.`;
            }

            document.getElementById('cpModelInfo').innerHTML =
                `Geselecteerd model: <strong>SBI${type}</strong> — F=${rail.F} mm, K=${rail.F / 2} mm, max. handelslengte ${rail.maxL} mm, min. laatste deel ${rail.minLast} mm.`;
            cpShowStep12b();
            if (cpGMode === 'auto') cpSyncAutoG();
            cpCalculate();
        }

        // ── Hoofdberekening (adaptatie van v9.1 calculate()) ──
        function cpCalculate() {
            const type = cpGetRailType();
            const rail = type ? RAILS[type] : null;
            const desired = +document.getElementById('lengthInput').value;
            if (!rail || !desired || desired <= 0) { cpClearOutputs(); return; }

            const { F, Gmin, maxL, minLast } = rail;
            const K = F / 2;

            let effectiveMaxL = maxL;
            if (cpMaxLEnabled) {
                const userMaxL = +document.getElementById('cpMaxlValue').value;
                if (!userMaxL || userMaxL <= 0) {
                    cpSetAlert('⚠ Vul een geldige max. deellengte in.', 'err');
                    cpClearOutputs(); return;
                }
                if (userMaxL < minLast) {
                    cpSetAlert(`⚠ Max. deellengte (${userMaxL} mm) is kleiner dan de minimale maat van het laatste deel (${minLast} mm) voor SBI${type}. Verhoog de limiet.`, 'err');
                    cpClearOutputs(); return;
                }
                effectiveMaxL = Math.min(maxL, userMaxL);
                document.getElementById('cpRMaxLUser').textContent = `${userMaxL} mm → effectief ${effectiveMaxL} mm`;
            }

            let g1, g2;
            if (cpGMode === 'auto') {
                const G = cpCalcAutoG(desired, F, Gmin);
                g1 = g2 = G;
                document.getElementById('cpG1').value = G;
                document.getElementById('cpG2').value = G;
            } else {
                g1 = +document.getElementById('cpG1').value;
                g2 = +document.getElementById('cpG2').value;
            }
            if (!g1 || !g2) return;

            cpClearAlert();

            if (cpGMode === 'manual' && (g1 < Gmin || g2 < Gmin)) {
                const autoG = cpCalcAutoG(desired, F, Gmin);
                cpSetAlert(
                    `⚠ G1 (${g1} mm) en/of G2 (${g2} mm) zijn kleiner dan het minimum van <strong>${Gmin} mm</strong> voor SBI${type}. Dit is niet toegestaan.` +
                    `<br><div style="margin-top:9px;display:flex;flex-wrap:wrap;gap:8px">` +
                    `<button type="button" class="sug-pill sug-best" onclick="cpApplyMinG(${Gmin})">Zet op minimum (${Gmin} mm)</button>` +
                    `<button type="button" class="sug-pill" onclick="cpSetGMode('auto')">Gebruik automatische berekening (${autoG} mm)</button>` +
                    `</div>`,
                    'err'
                );
                cpClearOutputs();
                return;
            }

            const mode = document.getElementById('cpNumPartsMode').value;
            let numParts, parts;

            if (mode === 'auto') {
                const result = cpAutoNumParts(desired, g1, g2, F, K, effectiveMaxL, minLast);
                if (!result) {
                    cpSetAlert(`⚠ Geen geldige verdeling gevonden voor ${desired} mm. Kies een andere totaallengte of pas G1/G2 aan.`, 'err');
                    cpShowSuggestions(desired, g1, g2, F, K, effectiveMaxL, minLast);
                    cpClearOutputs();
                    return;
                }
                numParts = result.numParts;
                parts = result.parts;
            } else {
                numParts = +document.getElementById('cpNumPartsManual').value;
                if (numParts < 1) return;
                parts = cpComputeParts(desired, g1, g2, F, K, effectiveMaxL, minLast, numParts);
                if (!parts) {
                    const auto = cpAutoNumParts(desired, g1, g2, F, K, effectiveMaxL, minLast);
                    cpSetAlert(
                        `⚠ Geen geldige verdeling mogelijk met <strong>${numParts} delen</strong>. ` +
                        (auto ? `Minimaal benodigde aantal: <strong>${auto.numParts} delen</strong>.` : ''),
                        'err'
                    );
                    cpShowSuggestions(desired, g1, g2, F, K, effectiveMaxL, minLast);
                    cpClearOutputs();
                    return;
                }
            }

            const totalAct = parts.reduce((s, p) => s + p.L, 0);

            const lastL = parts[parts.length - 1].L;
            cpHideSuggestions();

            if (cpGMode === 'auto' || (g1 >= Gmin && g2 >= Gmin)) {
                if (Math.abs(totalAct - desired) > 0.01) {
                    cpSetAlert(`⚠ Berekende totaal ${totalAct} mm wijkt af van gewenst ${desired} mm.`, 'warn');
                    cpShowSuggestions(desired, g1, g2, F, K, effectiveMaxL, minLast);
                } else if (lastL < minLast) {
                    cpSetAlert(`⚠ Laatste deel is <strong>${lastL} mm</strong> — korter dan de minimale maat van <strong>${minLast} mm</strong> voor SBI${type}. Kies een andere totaallengte.`, 'warn');
                    cpShowSuggestions(desired, g1, g2, F, K, effectiveMaxL, minLast);
                } else {
                    cpClearAlert();
                    cpSetAlert(`✓ Verdeling correct. ${numParts} ${numParts === 1 ? 'deel' : 'delen'}, K = ${K} mm.`, 'ok');
                    cpShowSuggestions(desired, g1, g2, F, K, effectiveMaxL, minLast);
                }
            }

            cpSetOut('cpOutNumParts', `<strong style="font-size:1.3rem">${numParts}</strong> <span class="unit">${numParts === 1 ? 'deel' : 'delen'}</span>`, 'ok');
            cpSetOut('cpOutK', `${K} <span class="unit">mm</span>`, 'ok');

            document.getElementById('cpRF').textContent = `${F} mm`;
            document.getElementById('cpRK').textContent = `${K} mm (= F/2)`;
            document.getElementById('cpRMaxL').textContent = cpMaxLEnabled ? `${maxL} mm (catalogus)` : `${maxL} mm`;
            document.getElementById('cpRMinLast').textContent = `${minLast} mm`;
            document.getElementById('cpRParts').textContent = `${numParts}`;
            document.getElementById('cpRG1G2').textContent = `${g1} / ${g2} mm`;
            document.getElementById('cpRTotal').textContent = `${totalAct} mm${Math.abs(totalAct - desired) < 0.01 ? ' ✓' : ''}`;

            cpRenderParts(parts, F, K, numParts);
            cpDrawSvg(parts, g1, g2, F, K, totalAct);

            // Status opslaan voor bestelcode / offerte-integratie
            cpValid = true;
            cpLastParts = parts;
            cpLastG1 = g1;
            cpLastG2 = g2;
            cpLastK = K;
            cpLastTotal = totalAct;

            document.getElementById('next12b').disabled = false;
            document.getElementById('cpSelSummary').textContent = `${numParts} ${numParts === 1 ? 'deel' : 'delen'} · K=${K} mm · G1/G2 = ${g1}/${g2} mm`;

            // Specificatieoverzicht bijwerken
            document.getElementById('bdCoupling').textContent = 'Ja — SBI' + type + ' > ' + maxL + ' mm handelslengte';
            document.getElementById('bdCouplingParts').textContent = numParts + (numParts === 1 ? ' deel' : ' delen');
            document.getElementById('bdCouplingK').textContent = K + ' mm';
            document.getElementById('bdCouplingG').textContent = g1 + ' / ' + g2 + ' mm';

            cpUpdateStep13Lock();
        }

        function cpClearOutputs() {
            cpHideSuggestions();
            cpValid = false;
            cpLastParts = null;
            ['cpOutNumParts', 'cpOutK'].forEach(id => cpSetOut(id, '—', ''));
            ['cpRF', 'cpRK', 'cpRMaxL', 'cpRMinLast', 'cpRParts', 'cpRG1G2', 'cpRTotal'].forEach(id => {
                document.getElementById(id).textContent = '—';
            });
            document.getElementById('cpRailList').innerHTML = '<div style="color:var(--muted);font-size:.88rem">Geen geldige verdeling.</div>';
            document.getElementById('cpRailSvg').innerHTML = '';
            document.getElementById('next12b').disabled = true;
            document.getElementById('cpSelSummary').textContent = 'Geen geldige verdeling gevonden';
            document.getElementById('bdCoupling').textContent = 'Nog niet geldig';
            document.getElementById('bdCouplingParts').textContent = '–';
            document.getElementById('bdCouplingK').textContent = '–';
            document.getElementById('bdCouplingG').textContent = '–';

            cpUpdateStep13Lock();
        }

        function cpRenderParts(parts, F, K, numParts) {
            const list = document.getElementById('cpRailList');
            list.innerHTML = '';
            parts.forEach((p, i) => {
                const isShort = p.isLast && numParts > 1;
                const startLbl = p.isFirst ? `G1=${p.gStart}` : `K=${p.gStart}`;
                const endLbl = p.isLast ? `G2=${p.gEnd}` : `K=${p.gEnd}`;
                const formula = `${startLbl} / ${p.n}×${F} / ${endLbl}`;

                const div = document.createElement('div');
                div.className = 'rail-card';
                div.innerHTML =
                    `<div class="rail-card-header ${isShort ? 'short' : 'full'}">` +
                    `<span>Deel ${i + 1}</span>` +
                    `<span style="font-size:.8rem;font-weight:400;margin-left:auto">${isShort ? 'op maat' : ''}</span>` +
                    `<strong style="font-family:'Fugue';font-size:1.1rem">${p.L} mm</strong>` +
                    `</div>` +
                    `<div class="rail-card-body">` +
                    `<span class="formula">${formula}</span>` +
                    ` &nbsp;·&nbsp; ${p.n + 1} gaten` +
                    (p.isFirst ? ` &nbsp;·&nbsp; G1: <strong>${p.gStart} mm</strong>` : '') +
                    (p.isLast ? ` &nbsp;·&nbsp; G2: <strong>${p.gEnd} mm</strong>` : '') +
                    (!p.isLast ? `<br><span class="joint-note">→ koppelpunt naar deel ${i + 2}: K = ${K} mm aan beide zijden</span>` : '') +
                    `</div>`;
                list.appendChild(div);
            });
        }

        // ── SVG (identiek aan v9.1) ──
        function cpDrawSvg(parts, g1, g2, F, K, totalLen) {
            const svg = document.getElementById('cpRailSvg');
            const W = Math.max(480, svg.parentElement.clientWidth - 4);
            const mg = 36;
            const sc = (W - mg * 2) / totalLen;
            const rH = 38, rY = 80, hR = 3.5, hY = rY + rH / 2, svgH = 175;

            const colFull = '#e8eed8', bordFull = '#b8c898';
            const colShort = '#ece0f0', bordShort = '#c8a8d8';

            let allHoles = [];
            let cursor = 0;
            parts.forEach(part => {
                for (let h = 0; h <= part.n; h++) allHoles.push(cursor + part.gStart + h * F);
                cursor += part.L;
            });

            let svg_html = '';
            svg_html += cpDimH(mg, mg + totalLen * sc, 16, '#0c2c65', `L totaal = ${totalLen} mm`, 12, 700);

            if (allHoles.length > 0) {
                svg_html += cpDimH(mg, mg + allHoles[0] * sc, rY + rH + 10, '#be0068', `G1=${g1}`, 11);
                const lastHole = allHoles[allHoles.length - 1];
                svg_html += cpDimH(mg + lastHole * sc, mg + totalLen * sc, rY + rH + 10, '#be0068', `G2=${g2}`, 11);
            }
            if (allHoles.length > 1) {
                svg_html += cpDimH(mg + allHoles[0] * sc, mg + allHoles[1] * sc, rY - 22, '#8898bb', `F=${F}`, 10);
            }

            cursor = 0;
            parts.forEach((part, i) => {
                const isShort = part.isLast && parts.length > 1;
                const rx = mg + cursor * sc;
                const rw = part.L * sc;
                const col = isShort ? colShort : colFull;
                const brd = isShort ? bordShort : bordFull;

                svg_html += `<rect x="${rx}" y="${rY}" width="${rw}" height="${rH}" fill="${col}" stroke="${brd}" stroke-width="1.5" rx="2"/>`;
                const tag = isShort ? ' · op maat' : '';
                svg_html += `<text x="${rx + rw / 2}" y="${rY - 8}" text-anchor="middle" font-family="Fugue,Trebuchet MS" font-size="12" fill="#6b7594" font-weight="600">Deel ${i + 1} · ${part.L} mm${tag}</text>`;

                if (!part.isLast) {
                    const jx = rx + rw;
                    const lastHoleRel = part.gStart + (part.n - 1) * F;
                    const kStartPx = mg + (cursor + lastHoleRel) * sc;
                    svg_html += `<rect x="${kStartPx}" y="${rY}" width="${jx - kStartPx}" height="${rH}" fill="#be0068" opacity=".13"/>`;
                    const nextPart = parts[i + 1];
                    const kEndPx = mg + (cursor + part.L + nextPart.gStart) * sc;
                    svg_html += `<rect x="${jx}" y="${rY}" width="${kEndPx - jx}" height="${rH}" fill="#be0068" opacity=".13"/>`;
                    svg_html += `<line x1="${jx}" y1="${rY - 5}" x2="${jx}" y2="${rY + rH + 5}" stroke="#be0068" stroke-width="1.5" stroke-dasharray="3,2"/>`;
                    svg_html += `<text x="${jx}" y="${svgH - 6}" text-anchor="middle" font-family="Fugue,Trebuchet MS" font-size="10" fill="#be0068" font-weight="600">K=${K}</text>`;
                }
                cursor += part.L;
            });

            allHoles.forEach(absPos => {
                const hx = mg + absPos * sc;
                svg_html += `<circle cx="${hx}" cy="${hY}" r="${hR}" fill="#2c6fad" stroke="#1a4a7a" stroke-width="1"/>`;
                svg_html += `<circle cx="${hx}" cy="${hY}" r="${hR * .4}" fill="#fff" opacity=".6"/>`;
            });

            svg.setAttribute('viewBox', `0 0 ${W} ${svgH}`);
            svg.setAttribute('width', W);
            svg.setAttribute('height', svgH);
            svg.innerHTML = svg_html;
        }

        function cpDimH(x1, x2, y, color, label, fs = 10, fw = 400) {
            const mid = (x1 + x2) / 2;
            return `
    <line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${color}" stroke-width="1.2"/>
    <line x1="${x1}" y1="${y - 4}" x2="${x1}" y2="${y + 4}" stroke="${color}" stroke-width="1.2"/>
    <line x1="${x2}" y1="${y - 4}" x2="${x2}" y2="${y + 4}" stroke="${color}" stroke-width="1.2"/>
    <text x="${mid}" y="${y + 14}" text-anchor="middle" font-family="Fugue,Trebuchet MS" font-size="${fs}" fill="${color}" font-weight="${fw}">${label}</text>`;
        }

        // ── Samenvatting / kopiëren / PNG-export ──
        function cpBuildBreakdownText() {
            if (!cpLastParts) return '';
            const type = cpGetRailType();
            const lines = [];
            lines.push('Type:          SBI' + type);
            lines.push('Totale lengte: ' + document.getElementById('cpRTotal').textContent);
            lines.push('G1 / G2:       ' + document.getElementById('cpRG1G2').textContent);
            lines.push('K:             ' + document.getElementById('cpRK').textContent);
            if (cpMaxLEnabled) lines.push('Max. deellengte (inbouwbeperking): ' + document.getElementById('cpRMaxLUser').textContent);
            lines.push('Aantal delen:  ' + document.getElementById('cpRParts').textContent);
            lines.push('');
            lines.push('Verdeling:');
            document.querySelectorAll('#cpRailList .rail-card').forEach((card, i) => {
                const hdr = card.querySelector('.rail-card-header strong');
                const formula = card.querySelector('.formula');
                if (hdr && formula) lines.push('  Deel ' + (i + 1) + ': ' + hdr.textContent + '  —  ' + formula.textContent);
            });
            return lines.join('\n');
        }

        function cpCopySummary() {
            const text = cpBuildBreakdownText();
            const btn = document.getElementById('cpBtnCopy');
            const restore = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Kopieer koppelverdeling';
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(() => {
                    btn.classList.add('copied');
                    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Gekopieerd!';
                    setTimeout(() => { btn.classList.remove('copied'); btn.innerHTML = restore; }, 2000);
                });
            }
        }

        function cpDownloadSvgAsPng() {
            try {
                const svg = document.getElementById('cpRailSvg');
                if (!svg || !svg.innerHTML) { console.warn('PNG-export: geen visualisatie beschikbaar om te exporteren.'); return; }

                let svgData = new XMLSerializer().serializeToString(svg);
                // Een losstaand SVG-document heeft de xmlns nodig — bij inline-SVG in HTML
                // wordt dit niet altijd door de serializer toegevoegd.
                if (!/xmlns=/.test(svgData)) {
                    svgData = svgData.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
                }

                const fallbackW = parseFloat(svg.getAttribute('width')) || 480;
                const fallbackH = parseFloat(svg.getAttribute('height')) || 175;

                // Data-URI i.p.v. blob: URL — werkt betrouwbaarder binnen (gesandboxte) iframes,
                // zoals wanneer deze tool als Custom HTML in YOOtheme/WordPress wordt ingeladen.
                const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData);

                const img = new Image();
                img.onload = function () {
                    try {
                        const scale = 2;
                        const w = Math.max(1, Math.round(img.naturalWidth || fallbackW));
                        const h = Math.max(1, Math.round(img.naturalHeight || fallbackH));
                        const canvas = document.createElement('canvas');
                        canvas.width = w * scale;
                        canvas.height = h * scale;
                        const ctx = canvas.getContext('2d');
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        ctx.scale(scale, scale);
                        ctx.drawImage(img, 0, 0, w, h);

                        const a = document.createElement('a');
                        a.download = 'rail-koppelverdeling.png';
                        a.href = canvas.toDataURL('image/png');
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                    } catch (err) {
                        console.error('PNG-export mislukt bij het tekenen op canvas:', err);
                    }
                };
                img.onerror = function (err) {
                    console.error('PNG-export mislukt: de SVG kon niet als afbeelding geladen worden.', err);
                };
                img.src = svgDataUrl;
            } catch (err) {
                console.error('PNG-export mislukt:', err);
            }
        }

        // ── Doorgaan naar stap 13 vanuit stap 12B ──
        function cpGoNext12b() {
            if (!cpValid) return;
            const card = document.getElementById('step12b');
            card.classList.remove('active');
            card.classList.add('done');
            const next = document.getElementById('step13');
            if (next) {
                next.classList.add('active');
                setTimeout(() => next.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
            }
        }

        window.addEventListener('resize', () => { if (cpCouplingActive && cpLastParts) cpCalculate(); });

// ── Bedrading naar de inline onclick-attributen ─────────────────────────────
// Vite bundelt naar een module, dus top-level declaraties komen níét meer op
// window terecht. De 94 `onclick="select(1,…)"`-attributen in de markup hebben
// ze daar wél nodig. Dit is de brug tot fase 2 ze vervangt door listeners.
Object.assign(window, {
  ensureDefaultsApplied,
  select,
  selectNoCarriage,
  skipCarriageSteps,
  restoreCarriageSteps,
  onLengthInput,
  applyLengthSuggestion,
  updateLengthSuggestions,
  syncStep13FromLength,
  onPitchInput,
  pitchApplyExact,
  pitchApplyMinG,
  onQtyInput,
  preselectDefaults,
  getNumWagons,
  getNumRails,
  wagonPositions,
  updateIllustration,
  cpUpdateStep13Lock,
  toggleStep,
  goNext,
  updateCode,
  updateProgress,
  copyCode,
  sendRequest,
  cpGetRailType,
  filterBlockTypes,
  cpOnModelChange,
  cpToggleMaxL,
  cpSetAlert,
  cpClearAlert,
  cpSetOut,
  cpSyncAutoG,
  cpApplyMinG,
  cpSetGMode,
  cpOnPartsModeChange,
  cpApplySuggestion,
  cpShowSuggestions,
  cpHideSuggestions,
  cpShowStep12b,
  cpHideStep12b,
  cpResetManualCouple,
  toggleManualCouple,
  cpUpdateCoupling,
  cpCalculate,
  cpClearOutputs,
  cpRenderParts,
  cpDrawSvg,
  cpDimH,
  cpBuildBreakdownText,
  cpCopySummary,
  cpDownloadSvgAsPng,
  cpGoNext12b,
  // Adapters naar src/domain — in v1.8 waren dit gewone globale functies.
  RAILS,
  cpCalcAutoG,
  cpCalcAutoGDetailed,
  cpComputeParts,
  cpAutoNumParts,
  cpFindSuggestions,
  step9FindSuggestions,
  buildCode,
});

// v1.8 hing dit aan DOMContentLoaded, dat níét meer vuurt als de configurator
// later wordt ingevoegd (page builder, AJAX-tab) — daar liep de illustratie op
// leeg. Dit dekt beide gevallen af.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => updateIllustration());
} else {
  updateIllustration();
}
