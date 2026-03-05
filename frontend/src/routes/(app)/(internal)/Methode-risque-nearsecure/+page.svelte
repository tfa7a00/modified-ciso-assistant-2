<script lang="ts">
	

	import { onMount, afterUpdate } from 'svelte';
	import { beforeNavigate } from '$app/navigation';
	import ExcelJS from 'exceljs';
	import DonutChart from '$lib/components/Chart/DonutChart.svelte';

	const METHODE_RISQUE_NEARSECURE_STORAGE_KEY = 'ciso-assistant-methode-risque-nearsecure';
	const METHODE_RISQUE_NEARSECURE_BACKUP_KEY = 'ciso-assistant-methode-risque-nearsecure-backup';
	const DEFAULT_PROJECT_ID = 'default';
	const MULTIPROJECT_STATE_VERSION = 2; // 1 = ancien format mono-projet, 2 = reference + projects

	/** Retire les balises HTML pour l'export Excel */
	function stripHtml(html: string): string {
		if (typeof html !== 'string') return String(html ?? '');
		return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
	}

	/** Mapping Tailwind bg-* / bg-[#xxx] vers ARGB Excel (FF + RRGGBB) — mêmes couleurs qu'à l'écran */
	const TAILWIND_TO_ARGB: Record<string, string> = {
		'bg-green-400': 'FF4ADE80',
		'bg-green-500': 'FF22C55E',
		'bg-green-600': 'FF16A34A',
		'bg-green-100': 'FFDCFCE7',
		'bg-yellow-300': 'FFFDE047',
		'bg-yellow-400': 'FFFACC15',
		'bg-yellow-500': 'FFEAB308',
		'bg-orange-400': 'FFFB923C',
		'bg-orange-500': 'FFF97316',
		'bg-orange-100': 'FFFFEDD5',
		'bg-red-500': 'FFEF4444',
		'bg-red-600': 'FFDC2626',
		'bg-red-700': 'FFB91C1C',
		'bg-red-900': 'FF7F1D1D',
		'bg-rose-900': 'FF881337',
		'bg-blue-600': 'FF2563EB',
		'bg-blue-400': 'FF60A5FA',
		'bg-sky-200': 'FFBAE6FD',
		'bg-sky-100': 'FFE0F2FE',
		'bg-sky-600': 'FF0284C7',
		'bg-gray-100': 'FFF3F4F6',
		'bg-gray-500': 'FF6B7280',
		'bg-gray-600': 'FF4B5563',
		'bg-slate-900': 'FF0F172A',
		'bg-amber-100': 'FFFEF3C7',
		'bg-amber-200': 'FFFDE68A',
		'bg-amber-500': 'FFF59E0B',
		'bg-amber-50': 'FFFFFBEB',
		'bg-white': 'FFFFFFFF',
		'bg-[#FFC000]': 'FFFFC000',
		'bg-[#ffc000]': 'FFFFC000',
		'bg-[#ff0000]': 'FFFF0000',
		'bg-[#ffff00]': 'FFFFFF00',
		'bg-[#92d050]': 'FF92D050',
		'bg-[#00b050]': 'FF00B050'
	};

	function tailwindToExcelArgb(bgColor: string | undefined): string | null {
		if (!bgColor) return null;
		// Extraire uniquement la classe bg-* (Aide-Risque utilise "bg-xxx border border-xxx text-black")
		const key = bgColor
			.replace(/ text-black| text-white/gi, '')
			.replace(/\s+border\s+border-\S+/g, '')
			.trim();
		return TAILWIND_TO_ARGB[key] ?? (key.startsWith('bg-[#') ? 'FF' + key.replace(/^bg-\[#|\]$/g, '') : null);
	}

	/** Couleur hex (#RRGGBB ou RRGGBB) vers ARGB Excel */
	function hexToExcelArgb(hex: string | undefined): string | null {
		if (!hex) return null;
		const h = hex.replace(/^#/, '');
		if (/^[0-9A-Fa-f]{6}$/.test(h)) return 'FF' + h.toUpperCase();
		return null;
	}

	const EXCEL_BORDER_THIN = { top: { style: 'thin' as const }, left: { style: 'thin' as const }, bottom: { style: 'thin' as const }, right: { style: 'thin' as const } };

	function applyCellStyle(cell: ExcelJS.Cell, opts: { fill?: string; bold?: boolean; border?: boolean; fontColor?: string }) {
		if (opts.fill) {
			cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.fill } };
		}
		if (opts.bold) {
			cell.font = { ...(cell.font as object), bold: true } as ExcelJS.Font;
		}
		if (opts.fontColor) {
			cell.font = { ...(cell.font as object), color: { argb: opts.fontColor }, bold: opts.bold ?? cell.font?.bold } as ExcelJS.Font;
		}
		if (opts.border) {
			cell.border = EXCEL_BORDER_THIN;
		}
		cell.alignment = { vertical: 'middle', wrapText: true };
	}

	/** En-tête de tableau : fond + texte blanc gras + bordures. fillArgb optionnel (défaut bleu sky-600). */
	function applyHeaderRow(worksheet: ExcelJS.Worksheet, row: ExcelJS.Row, fillArgb: string = 'FF0284C7') {
		row.eachCell((cell) => {
			cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillArgb } };
			cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
			cell.border = EXCEL_BORDER_THIN;
			cell.alignment = { vertical: 'middle', wrapText: true };
		});
	}

	/** Ligne titre (ex: RÉDACTION DU DOCUMENT) : fond slate-900, texte blanc. */
	function applyTitleRow(row: ExcelJS.Row) {
		row.eachCell((cell) => {
			cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
			cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
			cell.border = EXCEL_BORDER_THIN;
			cell.alignment = { vertical: 'middle', wrapText: true };
		});
	}

	function applyDataRowBorder(worksheet: ExcelJS.Worksheet, row: ExcelJS.Row) {
		row.eachCell((cell) => {
			cell.border = EXCEL_BORDER_THIN;
			cell.alignment = { vertical: 'middle', wrapText: true };
		});
	}

	/** Active le retour à la ligne (wrap text) sur toutes les cellules d'une feuille. */
	function applyWrapTextToSheet(ws: ExcelJS.Worksheet) {
		ws.eachRow({ includeEmpty: false }, (row) => {
			row.eachCell({ includeEmpty: true }, (cell) => {
				cell.alignment = { ...(cell.alignment as object || {}), vertical: 'middle', wrapText: true } as ExcelJS.Alignment;
			});
		});
	}

	type Row = Record<string, string>;

	// Gestion des 7 sous-parties de la méthode personnalisée (ajout de controle-document)
	type SectionId =
		| 'controle-document'
		| 'registre-classification'
		| 'aide-classification'
		| 'cartographie-risques'
		| 'aide-risque'
		| 'synthese'
		| 'ptr'
		| 'echelle-ptr'
		| 'parametrage';

	let activeSection: SectionId = 'controle-document';

	// Vue pour la cartographie: identification / risque brut / risque net / PTR+résiduel
	let cartoView: 'all' | 'identification' | 'brut' | 'net' | 'ptr' = 'identification';
	// Version du tableau cartographie : A (criticité/gravité/proba/IPC) ou B (efficacité DMR/PTR)
	let cartoVersion: 'A' | 'B' = 'A';

	/** Options d'export Excel : quelles feuilles/vues exporter */
	const EXPORT_EXCEL_SHEET_IDS: SectionId[] = [
		'controle-document',
		'registre-classification',
		'aide-classification',
		'cartographie-risques',
		'aide-risque',
		'synthese',
		'ptr',
		'echelle-ptr'
	];
	const EXPORT_EXCEL_SHEET_LABELS: Record<SectionId, string> = {
		'controle-document': 'Contrôle du document',
		'registre-classification': 'Registre de classification',
		'aide-classification': 'Aide-Classification',
		'cartographie-risques': 'Cartographie des risques',
		'aide-risque': 'Aide-Risque',
		'synthese': 'Synthèse',
		'ptr': 'PTR',
		'echelle-ptr': 'Échelle-PTR'
	};
	let showExportExcelModal = false;
	let exportExcelSheets: Record<string, boolean> = EXPORT_EXCEL_SHEET_IDS.reduce((acc, id) => ({ ...acc, [id]: true }), {});

	/** Vue de la cartographie à exporter : TOUT ou une vue ciblée */
	type ExportCartoView = 'all' | 'identification' | 'brut' | 'net' | 'ptr';
	let exportCartoView: ExportCartoView = 'all';
	const EXPORT_CARTO_VIEW_LABELS: Record<ExportCartoView, string> = {
		all: 'TOUT',
		identification: 'Identification',
		brut: 'Risque Brut',
		net: 'Degré & Risque Net',
		ptr: 'PTR + Résiduel'
	};

	function setAllExportSheets(value: boolean) {
		exportExcelSheets = EXPORT_EXCEL_SHEET_IDS.reduce((acc, id) => ({ ...acc, [id]: value }), {});
	}

	/** Colspans dynamiques pour la vue "all" : le regroupement reste correct quand on ajoute/supprime des impacts (Aide-Risque) */
	$: cartoRisqueBrutColspan = 3 + 1 + impactDefinitionsRows.length + 4; // Impact DIC (3) + Criticité (1) + N impacts + Gravité + Proba + I*P*C + Signification (4)
	$: cartoTotalCols = 3 + 17 + cartoRisqueBrutColspan + 1 + (cartoVersion === 'B' ? 4 : 5) + 2 + (cartoVersion === 'B' ? 4 : 5) + (editModeCarto ? 1 : 0);

	/** Indices de colonnes pour les vues filtrées (brut / net / ptr) : recalculés quand le nombre d'impacts change */
	$: cartoColEndId = 20;
	$: cartoColEndBrut = 20 + cartoRisqueBrutColspan;
	$: cartoColEndDMR = cartoColEndBrut + 1;
	$: cartoColEndNet = cartoColEndDMR + (cartoVersion === 'B' ? 4 : 5);
	$: cartoColEndPTR = cartoColEndNet + 2;
	$: cartoColEndRes = cartoColEndPTR + (cartoVersion === 'B' ? 4 : 5);
	/** Dernière colonne de données (sans la colonne Actions) : permet d'afficher la colonne Actions dans toutes les vues quand editModeCarto est actif */
	$: cartoLastDataCol = cartoTotalCols - (editModeCarto ? 1 : 0);
	$: cartoViewDynamicCss =
		`.view-identification tbody tr:not(.carto-part-header) td:nth-child(n+21):nth-child(-n+${cartoLastDataCol}){display:none}
.view-brut tbody tr:not(.carto-part-header) td:nth-child(n+1):nth-child(-n+3),
.view-brut tbody tr:not(.carto-part-header) td:nth-child(n+6):nth-child(-n+${cartoColEndId}),
.view-brut tbody tr:not(.carto-part-header) td:nth-child(n+${cartoColEndBrut + 1}):nth-child(-n+${cartoLastDataCol}){display:none}
.view-net tbody tr:not(.carto-part-header) td:nth-child(n+1):nth-child(-n+3),
.view-net tbody tr:not(.carto-part-header) td:nth-child(n+6):nth-child(-n+${cartoColEndBrut}),
.view-net tbody tr:not(.carto-part-header) td:nth-child(n+${cartoColEndNet + 1}):nth-child(-n+${cartoLastDataCol}){display:none}
.view-ptr tbody tr:not(.carto-part-header) td:nth-child(n+1):nth-child(-n+3),
.view-ptr tbody tr:not(.carto-part-header) td:nth-child(n+6):nth-child(-n+${cartoColEndNet}),
.view-ptr tbody tr:not(.carto-part-header) td:nth-child(n+${cartoColEndRes + 1}):nth-child(-n+${cartoLastDataCol}){display:none}`;

	// Données et formules pour la cartographie des risques (une ligne = un objet)
	type CartoRow = {
		// Identification (colonnes 1–10)
		entite: string;
		domaineProcessus: string;
		activites: string;
		codeRisque: string;
		descriptionScenario: string;
		mesureISO: string;
		familleRisque: string;
		source: string;
		familleCauses: string;
		proprietaireRisque: string;
		// Catégories d'actifs informationnels (7 cases à cocher)
		actifMateriel: boolean;
		actifApplication: boolean;
		actifEquipementsSecurite: boolean;
		actifEquipementsReseaux: boolean;
		actifRessourcesHumaines: boolean;
		actifDocument: boolean;
		actifDonnees: boolean;
		// Critères DIC (3 cases)
		dicD: boolean;
		dicI: boolean;
		dicC: boolean;
		// Dispositif de maîtrise, PTR
		dispositifMaitrise: string;
		actionPTR: string;
		decision: string;
		// Risque brut: Impact DIC (D, I, C) et impacts / probabilité (string | number pour bind input type="number")
		impactD: string | number;
		impactI: string | number;
		impactC: string | number;
		impactFinancier?: string | number;
		impactPP?: string | number;
		impactReputation?: string | number;
		impactReglementaire?: string | number;
		/** Valeurs des impacts (un par entrée de impactDefinitionsRows) – utilisé quand présent, sinon les 4 champs ci-dessus */
		impacts?: (string | number)[];
		probabilite: string | number;
		// Risque net
		graviteNet: string | number;
		probabiliteNet: string | number;
		// Risque résiduel
		impactResiduel: string | number;
		vraisemblanceResiduel: string | number;
		// Version B : Évaluation Risque Net (efficacité DMR)
		efficaciteDMR: string | number;
		niveauEfficaciteDMR: string; // 'acceptable' | 'insuffisant' | ''
		niveauRisqueNetB: string;
		// Version B : Évaluation Risque Résiduel (efficacité PTR depuis Aide-Risque)
		efficacitePTR: string; // niveau 1-5 (référence tableau efficacité)
	};

	/** Table des contrôles de l'Annexe A ISO 27001:2022 : ID → titre en français (pour infobulles) */
	const ISO27001_ANNEX_A_CONTROLS_FR: Record<string, string> = {
		'5.1': "Politiques pour la sécurité de l'information",
		'5.2': "Rôles et responsabilités en matière de sécurité de l'information",
		'5.3': 'Séparation des tâches',
		'5.4': 'Responsabilités de la direction',
		'5.5': 'Contact avec les autorités',
		'5.6': 'Contact avec les groupes d\'intérêt spéciaux',
		'5.7': 'Veille sur les menaces (threat intelligence)',
		'5.8': "Sécurité de l'information dans la gestion de projet",
		'5.9': "Inventaire des informations et autres actifs associés",
		'5.10': "Usage acceptable des informations et autres actifs associés",
		'5.11': 'Restitution des actifs',
		'5.12': "Classification de l'information",
		'5.13': "Étiquetage de l'information",
		'5.14': "Transfert d'information",
		'5.15': "Contrôle d'accès",
		'5.16': "Gestion des identités",
		'5.17': "Informations d'authentification",
		'5.18': "Droits d'accès",
		'5.19': "Sécurité de l'information dans les relations avec les fournisseurs",
		'5.20': "Prise en compte de la sécurité dans les accords avec les fournisseurs",
		'5.21': "Gestion de la sécurité dans la chaîne d'approvisionnement TIC",
		'5.22': "Surveillance, revue et gestion des changements des services fournisseurs",
		'5.23': "Sécurité de l'information pour l'utilisation des services de cloud",
		'5.24': "Planification et préparation de la gestion des incidents de sécurité",
		'5.25': "Évaluation et décision sur les événements de sécurité",
		'5.26': "Réponse aux incidents de sécurité",
		'5.27': "Apprentissage des incidents de sécurité",
		'5.28': "Collecte de preuves",
		'5.29': "Sécurité de l'information pendant les perturbations",
		'5.30': "Préparation des TIC à la continuité d'activité",
		'5.31': "Identification des exigences légales, réglementaires et contractuelles",
		'5.32': 'Droits de propriété intellectuelle',
		'5.33': 'Protection des enregistrements',
		'5.34': 'Vie privée et protection des données personnelles',
		'5.35': "Revue indépendante de la sécurité de l'information",
		'5.36': "Conformité aux politiques et normes de sécurité de l'information",
		'5.37': "Procédures d'exploitation documentées",
		'6.1': 'Vérification des antécédents (screening)',
		'6.2': "Conditions d'emploi relatives à la sécurité de l'information",
		'6.3': "Sensibilisation, formation et éducation à la sécurité de l'information",
		'6.4': 'Processus disciplinaire',
		'6.5': "Responsabilités après cessation ou changement d'emploi",
		'6.6': 'Accords de confidentialité ou de non-divulgation',
		'6.7': 'Télétravail',
		'6.8': "Signalement des événements de sécurité",
		'7.1': 'Périmètre de sécurité physique',
		'7.2': "Contrôles d'accès physiques",
		'7.3': 'Sécurisation des bureaux, salles et locaux',
		'7.4': 'Surveillance de la sécurité physique',
		'7.5': 'Protection contre les menaces physiques et environnementales',
		'7.6': 'Travail en zones sécurisées',
		'7.7': 'Bureau rangé et écran verrouillé',
		'7.8': 'Implantation et protection des équipements',
		'7.9': 'Sécurité des actifs hors site',
		'7.10': 'Supports de stockage',
		'7.11': 'Utilitaires de support',
		'7.12': 'Sécurité des câblages',
		'7.13': 'Maintenance des équipements',
		'7.14': 'Élimination ou réutilisation des équipements',
		'8.1': 'Dispositifs utilisateur',
		'8.2': "Droits d'accès privilégiés",
		'8.3': "Restriction d'accès à l'information",
		'8.4': 'Accès au code source',
		'8.5': 'Authentification sécurisée',
		'8.6': 'Gestion des capacités',
		'8.7': 'Protection contre les logiciels malveillants',
		'8.8': 'Gestion des vulnérabilités techniques',
		'8.9': 'Gestion de la configuration',
		'8.10': 'Suppression des informations',
		'8.11': 'Masquage des données',
		'8.12': 'Prévention de la fuite de données',
		'8.13': 'Sauvegarde des informations',
		'8.14': "Installations de traitement de l'information",
		'8.15': 'Journalisation',
		'8.16': 'Activités de surveillance',
		'8.17': 'Synchronisation des horloges',
		'8.18': "Utilisation de programmes utilitaires privilégiés",
		'8.19': 'Installation de logiciels sur les systèmes opérationnels',
		'8.20': 'Sécurité des réseaux',
		'8.21': 'Sécurité des services réseau',
		'8.22': 'Séparation des réseaux',
		'8.23': 'Filtrage web',
		'8.24': 'Utilisation de la cryptographie',
		'8.25': 'Cycle de vie du développement sécurisé',
		'8.26': "Sécurité des applications",
		'8.27': "Architecture sécurisée et principes de conception des systèmes",
		'8.28': 'Développement sécurisé (secure coding)',
		'8.29': "Tests de sécurité en développement et acceptation",
		'8.30': "Développement externalisé",
		'8.31': "Séparation des environnements de développement, test et production",
		'8.32': 'Gestion des changements',
		'8.33': "Informations de test",
		'8.34': "Audit des systèmes d'information"
	};

	/** Retourne le texte d'infobulle pour les contrôles ISO 27001 Annexe A (titres en français). */
	function getIso27001ControlTooltip(value: string | null | undefined): string {
		if (value == null || String(value).trim() === '') return '';
		const parts = String(value)
			.split(/[\n,;\s]+/)
			.map((p) => p.replace(/^A\.?/i, '').trim())
			.filter((p) => /^\d+\.\d+$/.test(p));
		const seen = new Set<string>();
		const lines: string[] = [];
		for (const id of parts) {
			if (seen.has(id)) continue;
			seen.add(id);
			const title = ISO27001_ANNEX_A_CONTROLS_FR[id];
			lines.push(title ? `A.${id} : ${title}` : `A.${id}`);
		}
		return lines.join('\n');
	}

	/** Définition des impacts (Évaluation de la Criticité du Risque Brut) – doit être déclaré avant defaultCartoRow/cartoRows */
	type ImpactDefinition = { libelle: string; definition: string };
	let impactDefinitionsRows: ImpactDefinition[] = [
		{ libelle: 'Impact Financier', definition: 'Impact financier direct ou indirect (pertes, coûts de remédiation, amendes, etc.).' },
		{ libelle: 'Impact Parties prenantes', definition: 'Impact sur les parties prenantes (clients, partenaires, fournisseurs, employés).' },
		{ libelle: 'Impact sur la Réputation', definition: 'Impact sur l\'image et la réputation de l\'organisation (médiatisation, confiance).' },
		{ libelle: 'Impact Réglementaire', definition: 'Impact réglementaire (non-conformité, sanctions, contrôles).' }
	];

	function parseNum(s: string | number | null | undefined): number | null {
		if (s === '' || s === null || s === undefined) return null;
		const n = Number(s);
		return Number.isFinite(n) ? n : null;
	}

	/** Criticité = MAX des impacts D, I, C pour lesquels le critère d'impact est sélectionné dans l'identification des risques inhérents (dicD, dicI, dicC). */
	function getCriticite(row: CartoRow): number | null {
		const vals: number[] = [];
		if (row.dicD) { const d = parseNum(row.impactD); if (d !== null) vals.push(d); }
		if (row.dicI) { const i = parseNum(row.impactI); if (i !== null) vals.push(i); }
		if (row.dicC) { const c = parseNum(row.impactC); if (c !== null) vals.push(c); }
		if (vals.length === 0) return null;
		return Math.max(...vals);
	}

	/** Retourne le tableau des impacts pour une ligne (longueur = impactDefinitionsRows.length), en migrant depuis les 4 champs si besoin */
	function getRowImpacts(row: CartoRow): (string | number)[] {
		const n = impactDefinitionsRows.length;
		const legacy = [
			row.impactFinancier ?? '',
			row.impactPP ?? '',
			row.impactReputation ?? '',
			row.impactReglementaire ?? ''
		];
		const src = row.impacts && row.impacts.length === n ? row.impacts : legacy;
		const out = src.slice(0, n);
		while (out.length < n) out.push('');
		return out;
	}

	/** Gravité = MAX des impacts (selon impactDefinitionsRows) */
	function getGravite(row: CartoRow): number | null {
		const vals = getRowImpacts(row).map((v) => parseNum(v));
		if (vals.every((v) => v === null)) return null;
		return Math.max(...vals.map((v) => v ?? 0));
	}

	/** I*P*C = Impact (Gravité) × Probabilité × Criticité */
	function getIpcBrut(row: CartoRow): number | null {
		const g = getGravite(row);
		const p = parseNum(row.probabilite);
		const c = getCriticite(row);
		if (g === null || p === null || c === null) return null;
		return g * p * c;
	}

	/** Signification du risque depuis le tableau 3.1 (Fréquence / probabilité d'occurrence) : valeur dans l'intervalle => définition correspondante. Retourne '-' si tableau vide ou valeur hors intervalles. */
	function getSignificationFromFrequenceTable(ipc: number | null): string {
		if (ipc === null) return '-';
		const rows = frequenceRisqueRows as (Row & { bgColor?: string })[];
		if (rows.length === 0) return '-';
		const intervals = rows
			.map((r) => {
				const parsed = parseInterval(r.signification ?? '');
				return parsed ? { ...parsed, row: r } : null;
			})
			.filter(Boolean) as { min: number; max: number; maxInclusive: boolean; row: Row & { bgColor?: string } }[];
		intervals.sort((a, b) => a.min - b.min);
		for (const it of intervals) {
			const inRange = it.maxInclusive
				? ipc >= it.min && ipc <= it.max
				: ipc >= it.min && ipc < it.max;
			if (inRange) return (it.row.definition ?? '').trim() || '-';
		}
		return '-';
	}

	/** Niveau / signification : uniquement depuis le tableau 3.1 (intervalle => définition). */
	function getNiveauFromIpc(ipc: number | null): string {
		if (ipc === null) return '-';
		return getSignificationFromFrequenceTable(ipc);
	}

	/** Couleurs des niveaux de risque : d'abord depuis le tableau 3.1 (définition => couleur), sinon palier par défaut. */
	function getNiveauRisqueBg(niveau: string): string {
		const n = (niveau || '').trim();
		const row = (frequenceRisqueRows as (Row & { bgColor?: string })[]).find(
			(r) => (r.definition ?? '').trim() === n
		);
		if (row) return getFrequenceRowBg(row);
		switch (niveau) {
			case 'Faible':
				return 'bg-green-400 text-black';
			case 'Modéré':
				return 'bg-yellow-300 text-black';
			case 'Élevé':
			case 'Elevé':
				return 'bg-orange-400 text-black';
			case 'Extrême':
				return 'bg-red-500 text-black';
			default:
				return 'bg-orange-200 text-black';
		}
	}

	function getNiveauBrut(row: CartoRow): string {
		return getNiveauFromIpc(getIpcBrut(row));
	}

	/** Risque net: I*P*C = Gravité net × Probabilité net × Criticité (même Criticité qu'en brut) */
	function getIpcNet(row: CartoRow): number | null {
		const c = getCriticite(row);
		const gn = parseNum(row.graviteNet);
		const pn = parseNum(row.probabiliteNet);
		if (c === null || gn === null || pn === null) return null;
		return gn * pn * c;
	}

	function getNiveauNet(row: CartoRow): string {
		return getNiveauFromIpc(getIpcNet(row));
	}

	/** Risque résiduel: I*P*C = Impact résiduel × Vraisemblance × Criticité */
	function getIpcResiduel(row: CartoRow): number | null {
		const c = getCriticite(row);
		const ir = parseNum(row.impactResiduel);
		const vr = parseNum(row.vraisemblanceResiduel);
		if (c === null || ir === null || vr === null) return null;
		return ir * vr * c;
	}

	function getNiveauResiduel(row: CartoRow): string {
		return getNiveauFromIpc(getIpcResiduel(row));
	}

	/** Taux de réduction DMR (0-1) depuis Aide-Risque → "Niveau d'efficacité" (efficaciteRows.valeur) */
	function getTauxReductionEfficacite(score: string | number | null | undefined): number | null {
		if (score === null || score === undefined || String(score).trim() === '') return null;
		// Les niveaux étant éditables (ajout/suppression), on fait un lookup sur la table plutôt que sur un barème fixe
		return getEfficaciteValeurByNiveau(String(score).trim());
	}

	/** Niveau d'efficacité (AK/AQ) : libellé depuis Aide-Risque → efficaciteRows.signification (niveaux éditables) */
	function getNiveauEfficaciteLabel(score: string | number | null | undefined): string {
		if (score === null || score === undefined || String(score).trim() === '') return '';
		const key = String(score).trim();

		// 1) Source de vérité : tableau Aide-Risque (éditable)
		const row = efficaciteRows.find((r) => String(r.niveau).trim() === key);
		if (row && row.signification) return String(row.signification).trim();

		// 2) Fallback legacy : si score numérique 1-5
		const n = typeof score === 'number' ? (Number.isFinite(score) ? score : null) : parseNum(score as string);
		if (n === null) return '';
		const labels: Record<number, string> = { 1: 'Insuffisant', 2: 'Faible', 3: 'Acceptable', 4: 'Efficace', 5: 'Exemplaire' };
		return labels[Math.round(n)] ?? '';
	}

	/** Valeur numérique d'efficacité (0-1) depuis le tableau Aide-Risque par niveau (1-5) */
	function getEfficaciteValeurByNiveau(niveau: string): number | null {
		const n = (niveau || '').trim();
		if (!n) return null;
		const row = efficaciteRows.find((r) => String(r.niveau).trim() === n);
		if (!row || row.valeur == null || row.valeur === '') return null;
		const v = Number(String(row.valeur).replace(',', '.'));
		return Number.isFinite(v) ? v : null;
	}

	/** Version B — Risque Net (AL) = (1 - taux_DMR) × Risque_Brut ; taux_DMR depuis Efficacité DMR 1-5 */
	function getIpcNetB(row: CartoRow): number | null {
		const ipcBrut = getIpcBrut(row);
		const taux = getTauxReductionEfficacite(row.efficaciteDMR);
		if (ipcBrut === null || taux === null) return null;
		return (1 - taux) * ipcBrut;
	}

	/** Version B — Signification du risque net (AM) à partir du niveau de risque net (AL), seuils >60 / ]36-60] / ]20-36] / ≤20 */
	function getSignificationRisqueNetB(row: CartoRow): string {
		const al = getIpcNetB(row);
		if (al === null) return '-';
		return getNiveauFromIpc(al);
	}

	/** Version B : Niveau de risque résiduel (AR) = (1 - taux_PTR) × Risque_Net_B (AL) */
	function getNiveauRisqueResiduelB(row: CartoRow): number | null {
		const ipcNetB = getIpcNetB(row);
		const effVal = getEfficaciteValeurByNiveau(row.efficacitePTR);
		if (ipcNetB === null || effVal === null) return null;
		return (1 - effVal) * ipcNetB;
	}

	/** Affichage du niveau de risque résiduel (Version B) avec 2 décimales */
	function formatNiveauRisqueResiduelBDisplay(row: CartoRow): string {
		const v = getNiveauRisqueResiduelB(row);
		if (v === null) return '-';
		return Number(v).toFixed(2);
	}

	/** Affichage du niveau de risque net (Version B) avec 1 décimale — colonne AL */
	function formatNiveauRisqueNetBDisplay(row: CartoRow): string {
		const v = getIpcNetB(row);
		if (v === null) return '-';
		return Number(v).toFixed(1);
	}

	/** Libellé d'efficacité PTR (colonne AQ) : Insuffisant, Faible, Acceptable, Efficace, Exemplaire — depuis niveau "1"-"5" ou tableau Aide-Risque */
	function getSignificationEfficacitePTRDisplay(niveau: string): string {
		if (!niveau || !niveau.trim()) return '-';
		const row = efficaciteRows.find((r) => String(r.niveau).trim() === String(niveau).trim());
		if (row && row.signification) return row.signification;
		// Fallback : niveau "1"-"5" → même libellés que getNiveauEfficaciteLabel
		return getNiveauEfficaciteLabel(niveau) || '-';
	}

	/** Affichage du pourcentage d'efficacité (intervalle ou %) depuis le tableau Aide-Risque */
	function getPourcentageEfficaciteDisplay(niveau: string): string {
		const row = efficaciteRows.find((r) => String(r.niveau).trim() === String(niveau || '').trim());
		if (!row) return '-';
		return row.intervalle || (row.valeur != null && row.valeur !== '' ? Math.round(parseFloat(String(row.valeur).replace(',', '.')) * 100) + ' %' : '-');
	}

	function defaultCartoRow(): CartoRow {
		return {
			entite: '',
			domaineProcessus: '',
			activites: '',
			codeRisque: '',
			descriptionScenario: '',
			mesureISO: '',
			familleRisque: '',
			source: '',
			familleCauses: '',
			proprietaireRisque: '',
			actifMateriel: false,
			actifApplication: false,
			actifEquipementsSecurite: false,
			actifEquipementsReseaux: false,
			actifRessourcesHumaines: false,
			actifDocument: false,
			actifDonnees: false,
			dicD: false,
			dicI: false,
			dicC: false,
			dispositifMaitrise: '',
			actionPTR: '',
			decision: '',
			impactD: '',
			impactI: '',
			impactC: '',
			impactFinancier: '',
			impactPP: '',
			impactReputation: '',
			impactReglementaire: '',
			impacts: impactDefinitionsRows.map(() => ''),
			probabilite: '',
			graviteNet: '',
			probabiliteNet: '',
			impactResiduel: '',
			vraisemblanceResiduel: '',
			efficaciteDMR: '',
			niveauEfficaciteDMR: '',
			niveauRisqueNetB: '',
			efficacitePTR: ''
		};
	}

	// Valeurs par défaut pour la première ligne (identification + PTR)
	const firstRowDefaultContent: Partial<CartoRow> = {
		entite: "DSI",
		domaineProcessus: "Systèmes d'Information",
		activites: "Gestion de l'infrastructure IT & Réseau",
		codeRisque: "DSI-R-SP-001",
		descriptionScenario: "Dégâts au niveau des infrastructures et installations informatiques au niveau de la salle des machines à cause de catastrophes naturelles (Montée d'eau, inondations, incendie, etc…).",
		mesureISO: "7.3\n7.13",
		familleRisque: "Sinistres physiques / Evènements naturels",
		source: "Externe",
		familleCauses: "Catastrophes Environnementales",
		proprietaireRisque: "DSI",
		actifMateriel: true,
		actifApplication: false,
		actifEquipementsSecurite: true,
		actifEquipementsReseaux: true,
		actifRessourcesHumaines: true,
		actifDocument: true,
		actifDonnees: true,
		dicD: true,
		dicI: false,
		dicC: false,
		dispositifMaitrise: "",
		actionPTR: "",
		decision: "Réduire"
	};

	// Valeurs par défaut pour la deuxième ligne (identification + PTR)
	const row2Content: Partial<CartoRow> = {
		entite: "DSI",
		domaineProcessus: "Systèmes d'Information",
		activites: "Gestion de l'infrastructure IT & Réseau",
		codeRisque: "DSI-R-SP-002",
		descriptionScenario: "Incendie en salle serveur (pouvant être causé par un court-circuit électrique, un incendie dans un local adjacent, …) entraînant une destruction des équipements",
		mesureISO: "7.3\n7.6",
		familleRisque: "Sinistres physiques / Evènements naturels",
		source: "Interne",
		familleCauses: "Catastrophes Environnementales",
		proprietaireRisque: "DSI",
		actifMateriel: true,
		actifApplication: false,
		actifEquipementsSecurite: true,
		actifEquipementsReseaux: true,
		actifRessourcesHumaines: false,
		actifDocument: false,
		actifDonnees: false,
		dicD: true,
		dicI: false,
		dicC: false,
		dispositifMaitrise: "",
		actionPTR: "",
		decision: "Réduire"
	};

	// Valeurs par défaut pour les lignes 3 à 44 de la cartographie
	const row3Content: Partial<CartoRow> = { entite: "DSI", domaineProcessus: "Systèmes d'Information", activites: "Gestion de l'infrastructure IT & Réseau", codeRisque: "DSI-R-SP-003", descriptionScenario: "Dégâts des eaux en Salle serveur par écoulement d'eau venant d'une fuite de canalisations ou de la terasse et entraînant une destruction des équipements stockés", mesureISO: "7.3\n7.4\n7.5\n7.6", familleRisque: "Sinistres physiques / Evènements naturels", source: "Externe", familleCauses: "Catastrophes Environnementales", proprietaireRisque: "DSI", actifMateriel: true, actifApplication: false, actifEquipementsSecurite: true, actifEquipementsReseaux: true, actifRessourcesHumaines: false, actifDocument: false, actifDonnees: false, dicD: true, dicI: false, dicC: false, dispositifMaitrise: "", actionPTR: "", decision: "Réduire" };
	const row4Content: Partial<CartoRow> = { entite: "DSI", domaineProcessus: "Systèmes d'Information", activites: "Gestion de l'infrastructure IT & Réseau", codeRisque: "DSI-R-SP-004", descriptionScenario: "Dégâts des eaux en Salle Serveur dûs à un fort taux d'humidité et entraînant une destruction des équipements stockés", mesureISO: "7.3\n7.6", familleRisque: "Sinistres physiques / Evènements naturels", source: "Interne", familleCauses: "Catastrophes Environnementales", proprietaireRisque: "DSI", actifMateriel: true, actifApplication: false, actifEquipementsSecurite: true, actifEquipementsReseaux: true, actifRessourcesHumaines: false, actifDocument: false, actifDonnees: false, dicD: true, dicI: false, dicC: false, dispositifMaitrise: "", actionPTR: "", decision: "Réduire" };
	const row5Content: Partial<CartoRow> = { entite: "DSI", domaineProcessus: "Systèmes d'Information", activites: "Gestion de l'infrastructure IT & Réseau", codeRisque: "DSI-R-SP-005", descriptionScenario: "Liquides renversés accidentellement sur un équipement en salle serveur", mesureISO: "7.3\n7.13", familleRisque: "Sinistres physiques / Evènements naturels", source: "Interne", familleCauses: "Catastrophes Environnementales", proprietaireRisque: "DSI", actifMateriel: true, actifApplication: false, actifEquipementsSecurite: true, actifEquipementsReseaux: true, actifRessourcesHumaines: false, actifDocument: false, actifDonnees: false, dicD: true, dicI: false, dicC: false, dispositifMaitrise: "", actionPTR: "", decision: "Réduire" };
	const row6Content: Partial<CartoRow> = { entite: "DSI", domaineProcessus: "Systèmes d'Information", activites: "Exploitation du SI/Etudes et projets de développement IT", codeRisque: "DSI-R-PSE-001", descriptionScenario: "Défaillance de la climatisation entraînant un accroissement de la température en Salle Serveur et occasionnant une dégradation des performances des équipements", mesureISO: "7.3", familleRisque: "Perte de services essentiels", source: "Interne", familleCauses: "Défaillance SI", proprietaireRisque: "DSI", actifMateriel: true, actifApplication: false, actifEquipementsSecurite: true, actifEquipementsReseaux: true, actifRessourcesHumaines: false, actifDocument: false, actifDonnees: false, dicD: true, dicI: false, dicC: false, dispositifMaitrise: "", actionPTR: "", decision: "Accepter" };
	const row7Content: Partial<CartoRow> = { entite: "DSI", domaineProcessus: "Systèmes d'Information", activites: "Exploitation du SI/Etudes et projets de développement IT", codeRisque: "DSI-R-PSE-002", descriptionScenario: "Perte d'alimentation énergétique dûe à l'incapacité de REDAL de fournir ses services d'électricité et entraînant en conséquence l'arrêt des systèmes de SOCIETE", mesureISO: "7.3\n7.11\n7.13\n5.19", familleRisque: "Perte de services essentiels", source: "Externe", familleCauses: "Défaillance prestataire des services", proprietaireRisque: "DSI", actifMateriel: true, actifApplication: false, actifEquipementsSecurite: true, actifEquipementsReseaux: true, actifRessourcesHumaines: false, actifDocument: false, actifDonnees: false, dicD: true, dicI: false, dicC: false, dispositifMaitrise: "", actionPTR: "", decision: "Réduire" };
	const row8Content: Partial<CartoRow> = { entite: "DSI", domaineProcessus: "Systèmes d'Information", activites: "Sécurité SI", codeRisque: "DSI-R-PSE-003", descriptionScenario: "Perte d'alimentation énergétique dûe à l'instabilité des services d'électricité de SOCIETE et entraînant en conséquence l'arrêt des systèmes de SOCIETE", mesureISO: "7.3", familleRisque: "Perte de services essentiels", source: "Interne", familleCauses: "Défaillance SI", proprietaireRisque: "DSI", actifMateriel: true, actifApplication: false, actifEquipementsSecurite: true, actifEquipementsReseaux: true, actifRessourcesHumaines: false, actifDocument: false, actifDonnees: false, dicD: true, dicI: false, dicC: false, dispositifMaitrise: "", actionPTR: "", decision: "Réduire" };
	const row9Content: Partial<CartoRow> = { entite: "DSI", domaineProcessus: "Systèmes d'Information", activites: "Sécurité SI", codeRisque: "DSI-R-PSE-004", descriptionScenario: "Indisponibilité/ dégradation du service suite à une saturation des ressources sur un service ou un système mutualisé non suffisamment dimensionné.", mesureISO: "8.6", familleRisque: "Perte de services essentiels", source: "Interne", familleCauses: "Défaillance SI", proprietaireRisque: "DSI", actifMateriel: true, actifApplication: true, actifEquipementsSecurite: false, actifEquipementsReseaux: false, actifRessourcesHumaines: false, actifDocument: false, actifDonnees: false, dicD: true, dicI: false, dicC: false, dispositifMaitrise: "", actionPTR: "", decision: "Réduire" };
	const row10Content: Partial<CartoRow> = { entite: "DSI", domaineProcessus: "Systèmes d'Information", activites: "Exploitation du SI/Etudes et projets de développement IT", codeRisque: "DSI-R-PSE-005", descriptionScenario: "Interruption de service et/ou perte de données critiques due à la défaillance matérielle ou logicielle du système", mesureISO: "8.19\n7.13", familleRisque: "Perte de services essentiels", source: "Interne", familleCauses: "Défaillance SI", proprietaireRisque: "DSI", actifMateriel: true, actifApplication: true, actifEquipementsSecurite: true, actifEquipementsReseaux: true, actifRessourcesHumaines: false, actifDocument: false, actifDonnees: true, dicD: true, dicI: true, dicC: false, dispositifMaitrise: "", actionPTR: "", decision: "Accepter" };
	const row11Content: Partial<CartoRow> = { entite: "DSI", domaineProcessus: "Systèmes d'Information", activites: "Exploitation du SI/Etudes et projets de développement IT", codeRisque: "DSI-R-PSE-006", descriptionScenario: "Interruption de service dans certains systèmes névralgiques dû à la dépendance et/ou à la défaillance des prestataires (hébergeur, infogérant, …)", mesureISO: "7.11\n7.13\n5.19", familleRisque: "Perte de services essentiels", source: "Interne", familleCauses: "Choix stratégique", proprietaireRisque: "DSI", actifMateriel: true, actifApplication: true, actifEquipementsSecurite: true, actifEquipementsReseaux: true, actifRessourcesHumaines: false, actifDocument: false, actifDonnees: false, dicD: true, dicI: false, dicC: false, dispositifMaitrise: "", actionPTR: "", decision: "Réduire" };
	const row12Content: Partial<CartoRow> = { entite: "DSI", domaineProcessus: "Systèmes d'Information", activites: "Exploitation du SI/Etudes et projets de développement IT", codeRisque: "DSI-R-CI-001", descriptionScenario: "Un utilisateur légitime (collaborateur de SOCIETE) branché sur le réseau intercepte des packets circulant sur le réseau entraînant des compromissions des données sensibles (login/mdp, données de porteurs de carte, ...)", mesureISO: "8.20\n8.21", familleRisque: "Compromission des informations", source: "Interne", familleCauses: "Facteurs Humains", proprietaireRisque: "DSI", actifMateriel: false, actifApplication: false, actifEquipementsSecurite: true, actifEquipementsReseaux: true, actifRessourcesHumaines: false, actifDocument: false, actifDonnees: true, dicD: false, dicI: false, dicC: true, dispositifMaitrise: "", actionPTR: "", decision: "Réduire" };
	const row13Content: Partial<CartoRow> = { entite: "DSI", domaineProcessus: "Systèmes d'Information", activites: "Exploitation du SI/Etudes et projets de développement IT", codeRisque: "DSI-R-CI-002", descriptionScenario: "Cheval de troie, Ver sur un Serveur ou Poste de travail occasionnant la fuite, l'atération, la corruption et l'indisponibilité des données critiques vers un système malveillant", mesureISO: "5.17\n8.20", familleRisque: "Compromission des informations", source: "Interne ou externe", familleCauses: "Défaillance SI", proprietaireRisque: "DSI", actifMateriel: true, actifApplication: true, actifEquipementsSecurite: true, actifEquipementsReseaux: true, actifRessourcesHumaines: false, actifDocument: false, actifDonnees: true, dicD: true, dicI: true, dicC: true, dispositifMaitrise: "", actionPTR: "", decision: "Réduire" };
	const row14Content: Partial<CartoRow> = { entite: "DSI", domaineProcessus: "Systèmes d'Information", activites: "Exploitation du SI/Etudes et projets de développement IT", codeRisque: "DSI-R-CI-003", descriptionScenario: "Infection par un rançonlogiciel d'un ou plusieurs équipement du parc informatique", mesureISO: "8.19\n8.23", familleRisque: "Compromission des informations", source: "Interne ou externe", familleCauses: "Défaillance SI", proprietaireRisque: "DSI", actifMateriel: true, actifApplication: false, actifEquipementsSecurite: false, actifEquipementsReseaux: false, actifRessourcesHumaines: false, actifDocument: false, actifDonnees: true, dicD: true, dicI: false, dicC: false, dispositifMaitrise: "", actionPTR: "", decision: "Réduire" };
	const row15Content: Partial<CartoRow> = { entite: "DSI", domaineProcessus: "Systèmes d'Information", activites: "Exploitation du SI/Etudes et projets de développement IT", codeRisque: "DSI-R-CI-004", descriptionScenario: "Une attaque informatique suite à une exploitation d'une vulnérabilité technique relative à l'absence des mises à jour d'un composant technique", mesureISO: "8.8", familleRisque: "Compromission des informations", source: "Interne ou externe", familleCauses: "Défaillance SI", proprietaireRisque: "DSI", actifMateriel: true, actifApplication: true, actifEquipementsSecurite: true, actifEquipementsReseaux: true, actifRessourcesHumaines: false, actifDocument: false, actifDonnees: false, dicD: true, dicI: true, dicC: true, dispositifMaitrise: "", actionPTR: "", decision: "Accepter" };
	const row16Content: Partial<CartoRow> = { entite: "DSI", domaineProcessus: "Systèmes d'Information", activites: "Exploitation du SI/Etudes et projets de développement IT", codeRisque: "DSI-R-CI-005", descriptionScenario: "Attaque informatique exploitant une vulnérabilité technique relative à l'obsolescence d'un composant technique", mesureISO: "8.8", familleRisque: "Compromission des informations", source: "Interne", familleCauses: "Défaillance SI", proprietaireRisque: "DSI", actifMateriel: true, actifApplication: false, actifEquipementsSecurite: true, actifEquipementsReseaux: true, actifRessourcesHumaines: false, actifDocument: false, actifDonnees: false, dicD: true, dicI: true, dicC: true, dispositifMaitrise: "", actionPTR: "", decision: "Accepter" };
	const row17Content: Partial<CartoRow> = { entite: "DSI", domaineProcessus: "Systèmes d'Information", activites: "Exploitation du SI/Etudes et projets de développement IT", codeRisque: "DSI-R-CI-006", descriptionScenario: "Dysfonctionnement des activités de SOCIETE dû à l'obsolescence des applications SI", mesureISO: "8.26", familleRisque: "Compromission des informations", source: "Interne", familleCauses: "Défaillance SI", proprietaireRisque: "DSI", actifMateriel: false, actifApplication: true, actifEquipementsSecurite: false, actifEquipementsReseaux: false, actifRessourcesHumaines: false, actifDocument: false, actifDonnees: false, dicD: true, dicI: true, dicC: false, dispositifMaitrise: "", actionPTR: "", decision: "Réduire" };
	const row18Content: Partial<CartoRow> = { entite: "DSI", domaineProcessus: "Systèmes d'Information", activites: "Exploitation du SI/Etudes et projets de développement IT", codeRisque: "DSI-R-CI-007", descriptionScenario: "Vol de supports/postes de travail ou fuite de documents renfermant les données critiques de SOCIETE, des bureaux opéré par un personnel interne", mesureISO: "8.1\n8.12\n7.8\n7.9", familleRisque: "Compromission des informations", source: "Interne", familleCauses: "Facteurs Humains", proprietaireRisque: "DSI", actifMateriel: true, actifApplication: false, actifEquipementsSecurite: false, actifEquipementsReseaux: false, actifRessourcesHumaines: true, actifDocument: true, actifDonnees: false, dicD: false, dicI: false, dicC: true, dispositifMaitrise: "", actionPTR: "", decision: "Réduire" };
	const row19Content: Partial<CartoRow> = { entite: "DSI", domaineProcessus: "Systèmes d'Information", activites: "Exploitation du SI/Etudes et projets de développement IT", codeRisque: "DSI-R-CI-008", descriptionScenario: "Vol de supports ou fuite de documents renfermant les données critiques de SOCIETE, des bureaux ou par fouille de poubelle opéré par un personnel légitime (personnel de ménage soudoyé, prestataire…)", mesureISO: "7.8\n7.10\n8.12", familleRisque: "Compromission des informations", source: "Externe", familleCauses: "Défaillance prestataire des services", proprietaireRisque: "DSI", actifMateriel: true, actifApplication: false, actifEquipementsSecurite: false, actifEquipementsReseaux: false, actifRessourcesHumaines: false, actifDocument: true, actifDonnees: true, dicD: false, dicI: false, dicC: true, dispositifMaitrise: "", actionPTR: "", decision: "Réduire" };
	const row20Content: Partial<CartoRow> = { entite: "DSI", domaineProcessus: "Systèmes d'Information", activites: "Exploitation du SI/Etudes et projets de développement IT", codeRisque: "DSI-R-CI-009", descriptionScenario: "Recyclage d'ordinateurs dont les disques durs (ayant stocké des données critiques) n'ont pas été formatés mais qui ont été réaffectés à d'autres utilisateurs de SOCIETEou offerts à d'autres organismes (dons aux associations, …) ou délaissés dans les bureaux", mesureISO: "7.14", familleRisque: "Compromission des informations", source: "Interne", familleCauses: "Défaillance SI", proprietaireRisque: "DSI", actifMateriel: true, actifApplication: false, actifEquipementsSecurite: false, actifEquipementsReseaux: false, actifRessourcesHumaines: false, actifDocument: false, actifDonnees: true, dicD: false, dicI: false, dicC: true, dispositifMaitrise: "", actionPTR: "", decision: "Réduire" };
	const row21Content: Partial<CartoRow> = { entite: "DSI", domaineProcessus: "Systèmes d'Information", activites: "Exploitation du SI/Etudes et projets de développement IT", codeRisque: "DSI-R-CI-010", descriptionScenario: "Divulgation volontaire des données critiques par une personne habilitée, à des tiers dont l'intention est de nuire aux intérêts de SOCIETE", mesureISO: "6.3\n6.6", familleRisque: "Compromission des informations", source: "Interne", familleCauses: "Facteurs Humains", proprietaireRisque: "DCH/ DSI", actifMateriel: false, actifApplication: false, actifEquipementsSecurite: false, actifEquipementsReseaux: false, actifRessourcesHumaines: true, actifDocument: false, actifDonnees: true, dicD: false, dicI: false, dicC: true, dispositifMaitrise: "", actionPTR: "", decision: "Accepter" };
	const row22Content: Partial<CartoRow> = { entite: "DSI", domaineProcessus: "Systèmes d'Information", activites: "Exploitation du SI/Etudes et projets de développement IT", codeRisque: "DSI-R-CI-011", descriptionScenario: "Recrutement d'un employé ayant des antécédents et/ou une morale douteuse ayant accès aux données sensibles", mesureISO: "6.1", familleRisque: "Compromission des informations", source: "Interne", familleCauses: "Facteurs Humains", proprietaireRisque: "DCH/ DSI", actifMateriel: false, actifApplication: false, actifEquipementsSecurite: false, actifEquipementsReseaux: false, actifRessourcesHumaines: true, actifDocument: false, actifDonnees: false, dicD: false, dicI: true, dicC: true, dispositifMaitrise: "", actionPTR: "", decision: "Accepter" };
	const row23Content: Partial<CartoRow> = { entite: "DSI", domaineProcessus: "Systèmes d'Information", activites: "Exploitation du SI/Etudes et projets de développement IT", codeRisque: "DSI-R-CI-012", descriptionScenario: "Endommagement des archives et documents à cause des rongeurs", mesureISO: "5.33", familleRisque: "Compromission des informations", source: "Externe", familleCauses: "Catastrophes environnementales", proprietaireRisque: "DSI", actifMateriel: false, actifApplication: false, actifEquipementsSecurite: false, actifEquipementsReseaux: false, actifRessourcesHumaines: false, actifDocument: true, actifDonnees: true, dicD: true, dicI: false, dicC: false, dispositifMaitrise: "", actionPTR: "", decision: "Accepter" };
	const row24Content: Partial<CartoRow> = { entite: "DSI", domaineProcessus: "Systèmes d'Information", activites: "Exploitation du SI/Etudes et projets de développement IT", codeRisque: "DSI-R-CI-013", descriptionScenario: "Fuite d'informations critique à travers un support amovible  introduit au sein des locaux ou via impression par un personnel légitime ou un collaborateur", mesureISO: "8.12\n7.10", familleRisque: "Compromission des informations", source: "Interne", familleCauses: "Facteurs humains", proprietaireRisque: "DSI", actifMateriel: false, actifApplication: true, actifEquipementsSecurite: false, actifEquipementsReseaux: false, actifRessourcesHumaines: true, actifDocument: false, actifDonnees: true, dicD: false, dicI: false, dicC: true, dispositifMaitrise: "", actionPTR: "", decision: "Réduire" };
	const row25Content: Partial<CartoRow> = { entite: "DSI", domaineProcessus: "Systèmes d'Information", activites: "Exploitation du SI/Etudes et projets de développement IT", codeRisque: "DSI-R-CI-014", descriptionScenario: "Fuite/Altération de données, attaque ou arrêt des activités et SI critiques suite à un incident causé par/à travers  les intérimaires qui accédent à des systèmes critiques à travers des postes non maîtrisés par la DSI", mesureISO: "8.12\n7.10", familleRisque: "Compromission des informations", source: "Interne", familleCauses: "Facteurs humains", proprietaireRisque: "DSI", actifMateriel: false, actifApplication: true, actifEquipementsSecurite: false, actifEquipementsReseaux: false, actifRessourcesHumaines: true, actifDocument: false, actifDonnees: true, dicD: false, dicI: true, dicC: true, dispositifMaitrise: "", actionPTR: "", decision: "Accepter" };
	const row26Content: Partial<CartoRow> = { entite: "DSI", domaineProcessus: "Systèmes d'Information", activites: "Sécurité SI", codeRisque: "DSI-R-CF-001", descriptionScenario: "Usurpation de droits utilisateurs en interne suite à un vol de mots de passe (essai des mots de passe d'installation ou de listes de mots de passes triviaux, passage d'un dictionnaire, attaque de force brute) entraînant un accès illicite aux systèmes , applications et bases de données", mesureISO: "8.5", familleRisque: "Compromission des fonctions", source: "Interne", familleCauses: "Facteurs Humains", proprietaireRisque: "DSI", actifMateriel: false, actifApplication: false, actifEquipementsSecurite: false, actifEquipementsReseaux: false, actifRessourcesHumaines: true, actifDocument: false, actifDonnees: true, dicD: false, dicI: false, dicC: true, dispositifMaitrise: "", actionPTR: "", decision: "Réduire" };
	const row27Content: Partial<CartoRow> = { entite: "DSI", domaineProcessus: "Systèmes d'Information", activites: "Sécurité SI", codeRisque: "DSI-R-CF-002", descriptionScenario: "Fraude interne opérée par un personnel qui a cumulé plusieurs habilitations pour des tâches incompatibles", mesureISO: "8.2\n8.3", familleRisque: "Compromission des fonctions", source: "Interne", familleCauses: "Organisation et systèmes de gestion", proprietaireRisque: "DSI", actifMateriel: false, actifApplication: true, actifEquipementsSecurite: false, actifEquipementsReseaux: false, actifRessourcesHumaines: true, actifDocument: false, actifDonnees: true, dicD: false, dicI: true, dicC: true, dispositifMaitrise: "", actionPTR: "", decision: "Accepter" };
	const row28Content: Partial<CartoRow> = { entite: "DSI", domaineProcessus: "Systèmes d'Information", activites: "Sécurité SI", codeRisque: "DSI-R-CF-003", descriptionScenario: "Baisse des capacités du réseau dans les locaux de SOCIETE due à une utilisation inappropriée et intensive de l'Internet ou à une saturation de réseau", mesureISO: "8.20\n8.21", familleRisque: "Compromission des fonctions", source: "Interne\nExterne", familleCauses: "Facteurs Humains", proprietaireRisque: "DSI", actifMateriel: false, actifApplication: false, actifEquipementsSecurite: true, actifEquipementsReseaux: true, actifRessourcesHumaines: true, actifDocument: false, actifDonnees: false, dicD: true, dicI: false, dicC: false, dispositifMaitrise: "", actionPTR: "", decision: "Réduire" };
	const row29Content: Partial<CartoRow> = { entite: "DSI", domaineProcessus: "Systèmes d'Information", activites: "Sécurité SI", codeRisque: "DSI-R-CF-004", descriptionScenario: "Accès au partage par des personnes ne devant pas posséder ce droit et qui peut entrainer une altération/ Fuite/ Divulgation des données administratives de SOCIETE", mesureISO: "8.20\n8.21\n8.22", familleRisque: "Compromission des fonctions", source: "Interne", familleCauses: "Facteurs Humains", proprietaireRisque: "DSI", actifMateriel: false, actifApplication: false, actifEquipementsSecurite: false, actifEquipementsReseaux: false, actifRessourcesHumaines: true, actifDocument: true, actifDonnees: true, dicD: false, dicI: true, dicC: true, dispositifMaitrise: "", actionPTR: "", decision: "Réduire" };
	const row30Content: Partial<CartoRow> = { entite: "DSI", domaineProcessus: "Systèmes d'Information", activites: "Sécurité SI", codeRisque: "DSI-R-CF-005", descriptionScenario: "Atteinte à la confidentialité et l'intégrité des données due à l'usurpation des moyens d'accès au compte d'Administrateur Système (Accès non autorisé ou illicite aux SI)", mesureISO: "8.2", familleRisque: "Compromission des fonctions", source: "Interne \nExterne", familleCauses: "Facteurs Humains", proprietaireRisque: "DSI", actifMateriel: false, actifApplication: false, actifEquipementsSecurite: false, actifEquipementsReseaux: false, actifRessourcesHumaines: true, actifDocument: true, actifDonnees: true, dicD: false, dicI: true, dicC: true, dispositifMaitrise: "", actionPTR: "", decision: "Réduire" };
	const row31Content: Partial<CartoRow> = { entite: "DSI", domaineProcessus: "Systèmes d'Information", activites: "Exploitation du SI/Etudes et projets de développement IT", codeRisque: "DSI-R-CF-006", descriptionScenario: "Défaillance dans la réalisation des projets SI due à des contraintes administratives et/ou techniques et/ou force majeure \"Pandémie,…\"", mesureISO: "5.8", familleRisque: "Compromission des fonctions", source: "Interne", familleCauses: "Organisation et systèmes de gestion", proprietaireRisque: "DSI", actifMateriel: false, actifApplication: false, actifEquipementsSecurite: false, actifEquipementsReseaux: false, actifRessourcesHumaines: true, actifDocument: true, actifDonnees: false, dicD: true, dicI: true, dicC: false, dispositifMaitrise: "", actionPTR: "", decision: "Réduire" };
	const row32Content: Partial<CartoRow> = { entite: "DSI", domaineProcessus: "Systèmes d'Information", activites: "Organisation interne RH", codeRisque: "DSI-R-CF-007", descriptionScenario: "Phishing: Réponse d'un utilisateur ou d'un administrateur à un courrier élèctronique pouvant entraîner une divulgation d'informations sensibles (données à caractère personnel, données secrètes d'authentification,  …) ou réaliser une opération non autorisée", mesureISO: "6.3", familleRisque: "Compromission des fonctions", source: "externe", familleCauses: "Facteurs Humains", proprietaireRisque: "DCH/ DSI", actifMateriel: false, actifApplication: false, actifEquipementsSecurite: false, actifEquipementsReseaux: false, actifRessourcesHumaines: true, actifDocument: false, actifDonnees: true, dicD: false, dicI: true, dicC: true, dispositifMaitrise: "", actionPTR: "", decision: "Réduire" };
	const row33Content: Partial<CartoRow> = { entite: "DSI", domaineProcessus: "Systèmes d'Information", activites: "Exploitation du SI/Etudes et projets de développement IT", codeRisque: "DSI-R-AI-001", descriptionScenario: "Raccordement d'un poste de travail non autorisé (ne respectant pas les standards de sécurité de SOCIETE) sur le réseau de SOCIETE(exemple de poste de travail appartenant à des stagiaires, des prestataires,…)", mesureISO: "8.20\n8.21", familleRisque: "Acte illicite", source: "Externe", familleCauses: "Défaillance SI", proprietaireRisque: "DSI", actifMateriel: true, actifApplication: false, actifEquipementsSecurite: false, actifEquipementsReseaux: true, actifRessourcesHumaines: false, actifDocument: false, actifDonnees: false, dicD: false, dicI: false, dicC: true, dispositifMaitrise: "", actionPTR: "", decision: "Réduire" };
	const row34Content: Partial<CartoRow> = { entite: "DSI", domaineProcessus: "Systèmes d'Information", activites: "Exploitation du SI/Etudes et projets de développement IT", codeRisque: "DSI-R-AI-002", descriptionScenario: "Intrusion sur le SI de SOCIETEdepuis l'extérieur entraînant l'interception ou/et la non disponibilité des données de SOCIETE", mesureISO: "8.3", familleRisque: "Acte illicite", source: "Externe", familleCauses: "Défaillance SI", proprietaireRisque: "DSI", actifMateriel: false, actifApplication: false, actifEquipementsSecurite: true, actifEquipementsReseaux: true, actifRessourcesHumaines: false, actifDocument: false, actifDonnees: false, dicD: true, dicI: true, dicC: true, dispositifMaitrise: "", actionPTR: "", decision: "Réduire" };
	const row35Content: Partial<CartoRow> = { entite: "DSI", domaineProcessus: "Systèmes d'Information", activites: "Exploitation du SI/Etudes et projets de développement IT", codeRisque: "DSI-R-AI-003", descriptionScenario: "Perte de la disponibilité ou la confidentialité ou l'intégrité des SI de SOCIETEsuite à la divulgation ou l'explolitation des vulnérabilités techniques non corrigées, issues des audits techniques ou partagées par le DSI", mesureISO: "8.8", familleRisque: "Acte illicite", source: "Interne", familleCauses: "Défaillance SI", proprietaireRisque: "DSI", actifMateriel: false, actifApplication: false, actifEquipementsSecurite: false, actifEquipementsReseaux: false, actifRessourcesHumaines: true, actifDocument: true, actifDonnees: true, dicD: true, dicI: true, dicC: true, dispositifMaitrise: "", actionPTR: "", decision: "Réduire" };
	const row36Content: Partial<CartoRow> = { entite: "DSI", domaineProcessus: "Systèmes d'Information", activites: "Exploitation du SI/Etudes et projets de développement IT", codeRisque: "DSI-R-MP-001", descriptionScenario: "Absence d'un accompagnement de la sécurité de SOCIETEdans les projets SI qui peut induire au déploiement d'un SI avec des vulnérabilités embarquées", mesureISO: "5.8\n8.25", familleRisque: "Mise en production non maitrisée", source: "Interne", familleCauses: "Organisation et systèmes de gestion", proprietaireRisque: "DSI", actifMateriel: false, actifApplication: false, actifEquipementsSecurite: false, actifEquipementsReseaux: false, actifRessourcesHumaines: true, actifDocument: true, actifDonnees: false, dicD: true, dicI: true, dicC: true, dispositifMaitrise: "", actionPTR: "", decision: "Réduire" };
	const row37Content: Partial<CartoRow> = { entite: "DSI", domaineProcessus: "Systèmes d'Information", activites: "Exploitation du SI/Etudes et projets de développement IT", codeRisque: "DSI-R-MP-002", descriptionScenario: "Fuites de données graves suite à une mise en production de logiciels avec des failles de sécurité latentes", mesureISO: "8.12\n8.29", familleRisque: "Mise en production non maitrisée", source: "Interne", familleCauses: "Organisation et systèmes de gestion", proprietaireRisque: "DSI", actifMateriel: false, actifApplication: true, actifEquipementsSecurite: false, actifEquipementsReseaux: false, actifRessourcesHumaines: true, actifDocument: false, actifDonnees: true, dicD: false, dicI: false, dicC: true, dispositifMaitrise: "", actionPTR: "", decision: "Réduire" };
	const row38Content: Partial<CartoRow> = { entite: "DSI", domaineProcessus: "Systèmes d'Information", activites: "Exploitation du SI/Etudes et projets de développement IT", codeRisque: "DSI-R-MP-003", descriptionScenario: "Atteinte à la sécurité et à la stabilité du SI suite à l'installation de correctifs ou mises à jour système", mesureISO: "8.8", familleRisque: "Mise en production non maitrisée", source: "Interne", familleCauses: "Organisation et systèmes de gestion", proprietaireRisque: "DSI", actifMateriel: true, actifApplication: true, actifEquipementsSecurite: true, actifEquipementsReseaux: true, actifRessourcesHumaines: false, actifDocument: false, actifDonnees: false, dicD: true, dicI: true, dicC: false, dispositifMaitrise: "", actionPTR: "", decision: "Réduire" };
	const row39Content: Partial<CartoRow> = { entite: "DSI", domaineProcessus: "Systèmes d'Information", activites: "Exploitation du SI/Etudes et projets de développement IT", codeRisque: "DSI-R-CL-001", descriptionScenario: "Pénalités dues à une transgression des droits d'auteur liées à un dépassement dans l'utilisation des licences (Risque lié à une gestion non maitrisée des licences informatiques)", mesureISO: "5.32", familleRisque: "Risque Juridique", source: "Interne", familleCauses: "Non conformité juridique /réglementaire", proprietaireRisque: "DSI", actifMateriel: false, actifApplication: true, actifEquipementsSecurite: false, actifEquipementsReseaux: false, actifRessourcesHumaines: true, actifDocument: false, actifDonnees: true, dicD: false, dicI: true, dicC: false, dispositifMaitrise: "", actionPTR: "", decision: "Réduire" };
	const row40Content: Partial<CartoRow> = { entite: "DSI", domaineProcessus: "Systèmes d'Information", activites: "Exploitation du SI/Etudes et projets de développement IT", codeRisque: "DSI-R-CL-002", descriptionScenario: "Atteinte à la vie privée, compromission ou divulgation de données à caractère personnel (données personnels des clients ou bien des collaborateurs, fichier de salaires, prime des collaborateurs internes....)  entraînant systématiquement une violation à la loi 09-08 et donc des poursuites judiciaires", mesureISO: "5.34", familleRisque: "Risque Juridique", source: "Interne", familleCauses: "Non conformité juridique /réglementaire", proprietaireRisque: "DSI", actifMateriel: false, actifApplication: false, actifEquipementsSecurite: false, actifEquipementsReseaux: false, actifRessourcesHumaines: true, actifDocument: false, actifDonnees: true, dicD: false, dicI: false, dicC: true, dispositifMaitrise: "", actionPTR: "", decision: "Réduire" };
	const row41Content: Partial<CartoRow> = { entite: "DSI", domaineProcessus: "Systèmes d'Information", activites: "Exploitation du SI/Etudes et projets de développement IT", codeRisque: "DSI-R-TIER-001", descriptionScenario: "Divulgation d'information ou des données des SI par un tiers", mesureISO: "5.19\n5.20", familleRisque: "Gestion des tiers", source: "Externe", familleCauses: "Défaillance prestataire des services", proprietaireRisque: "DSI", actifMateriel: false, actifApplication: true, actifEquipementsSecurite: false, actifEquipementsReseaux: false, actifRessourcesHumaines: true, actifDocument: false, actifDonnees: true, dicD: false, dicI: true, dicC: true, dispositifMaitrise: "", actionPTR: "", decision: "Réduire" };
	const row42Content: Partial<CartoRow> = { entite: "DSI", domaineProcessus: "Systèmes d'Information", activites: "Exploitation du SI/Etudes et projets de développement IT", codeRisque: "DSI-R-TIER-002", descriptionScenario: "Erreur dans la mise en œuvre d'une action, modification préjudiciable des SI par un tiers", mesureISO: "5.19\n5.20", familleRisque: "Gestion des tiers", source: "Externe", familleCauses: "Défaillance prestataire des services", proprietaireRisque: "DSI", actifMateriel: false, actifApplication: true, actifEquipementsSecurite: false, actifEquipementsReseaux: false, actifRessourcesHumaines: true, actifDocument: false, actifDonnees: false, dicD: false, dicI: true, dicC: false, dispositifMaitrise: "", actionPTR: "", decision: "Réduire" };
	const row43Content: Partial<CartoRow> = { entite: "DSI", domaineProcessus: "Systèmes d'Information", activites: "Exploitation du SI/Etudes et projets de développement IT", codeRisque: "DSI-R-TIER-003", descriptionScenario: "Non respect des délais contractuels ou dépendance à un prestataire", mesureISO: "5.20\n5.22", familleRisque: "Gestion des tiers", source: "Externe", familleCauses: "Défaillance prestataire des services", proprietaireRisque: "DSI", actifMateriel: false, actifApplication: false, actifEquipementsSecurite: false, actifEquipementsReseaux: false, actifRessourcesHumaines: true, actifDocument: false, actifDonnees: false, dicD: false, dicI: true, dicC: false, dispositifMaitrise: "", actionPTR: "", decision: "Accepter" };
	const row44Content: Partial<CartoRow> = { entite: "DSI", domaineProcessus: "Systèmes d'Information", activites: "Exploitation du SI/Etudes et projets de développement IT", codeRisque: "DSI-R-TIER-004", descriptionScenario: "Défaillance du fournisseur internet principal causant un défaut généralisé d'accès internet ,coupant les connexions au niveaux des locaux SOCIETE", mesureISO: "5.19\n5.22", familleRisque: "Gestion des tiers", source: "Externe", familleCauses: "Défaillance prestataire des services", proprietaireRisque: "DSI", actifMateriel: false, actifApplication: false, actifEquipementsSecurite: false, actifEquipementsReseaux: true, actifRessourcesHumaines: true, actifDocument: false, actifDonnees: false, dicD: true, dicI: false, dicC: false, dispositifMaitrise: "", actionPTR: "", decision: "Accepter" };

	const cartoRowDefaults: (Partial<CartoRow> | undefined)[] = [ firstRowDefaultContent, row2Content, row3Content, row4Content, row5Content, row6Content, row7Content, row8Content, row9Content, row10Content, row11Content, row12Content, row13Content, row14Content, row15Content, row16Content, row17Content, row18Content, row19Content, row20Content, row21Content, row22Content, row23Content, row24Content, row25Content, row26Content, row27Content, row28Content, row29Content, row30Content, row31Content, row32Content, row33Content, row34Content, row35Content, row36Content, row37Content, row38Content, row39Content, row40Content, row41Content, row42Content, row43Content, row44Content ];

	function resetCartoTable() {
		cartoRows = Array.from({ length: 45 }, (_, i) =>
			cartoRowDefaults[i] ? { ...defaultCartoRow(), ...cartoRowDefaults[i] } as CartoRow : defaultCartoRow()
		);
		saveCustomMethodState();
	}

	// Tableau de 45 lignes pour les formules de la cartographie des risques
	let cartoRows: CartoRow[] = Array.from({ length: 45 }, (_, i) =>
		cartoRowDefaults[i] ? { ...defaultCartoRow(), ...cartoRowDefaults[i] } as CartoRow : defaultCartoRow()
	);

	// --- Données pour Contrôle du document ---
	type RedactionRow = {
		role: string;
		nom: string;
		fonction: string;
		date: string;
	};

	let redactionRows: RedactionRow[] = [
		{ role: 'Écrit par :', nom: 'Consultants SSI', fonction: 'NEARSECURE', date: '' },
		{ role: 'Relu par :', nom: '', fonction: '', date: '' },
		{ role: 'Approuvé par :', nom: '', fonction: '', date: '' }
	];

	type DiffusionRow = {
		nom: string;
		entite_fonction: string;
		date: string;
	};

	let diffusionRows: DiffusionRow[] = [
		{ nom: '', entite_fonction: '', date: '' },
		{ nom: '', entite_fonction: '', date: '' },
		{ nom: '', entite_fonction: '', date: '' },
		{ nom: '', entite_fonction: '', date: '' }
	];

	type VersionRow = {
		version: string;
		date: string;
		modification: string;
	};

	let versionRows: VersionRow[] = [
		{ version: '', date: '', modification: '' },
		{ version: '', date: '', modification: '' },
		{ version: '', date: '', modification: '' },
		{ version: '', date: '', modification: '' }
	];

	let editModeControleDocument = false;
	let editModeRegistre = false;
	let editModeTable2Categories = false;
	let editModeCarto = false;
	let editModePTR = false;

	// --- Données pour Registre de classification ---
	type RegistreRow = {
		id: string;
		processus_metier: string;
		activite_sous_processus: string;
		designation_actif: string;
		description_actif: string;
		categorie_actif: string;
		type_actif: string;
		proprietaire_actif: string;
		disponibilite: string;
		integrite: string;
		confidentialite: string;
		sensibilite: string;
		/** Section 7 – Loi 05.20 : Impact Disponibilité (T/G/M/L) */
		impactDispo0520?: string;
		/** Section 7 – Loi 05.20 : Impact Intégrité */
		impactIntegrite0520?: string;
		/** Section 7 – Loi 05.20 : Impact Confidentialité */
		impactConfid0520?: string;
		commentaire: string;
	};

	/** Afficher la section 7 (Classification selon la loi n° 05.20) dans le registre */
	let showRegistreLoi0520 = false;


	/** Échelle d'impact du référentiel fixé par la loi n° 05.20 et son décret d'application (Section 7 – options pour Impact D/I/C) */
	const REGISTRE_LOI0520_OPTIONS: string[] = [
		'TG: nuire au maintien des capacités de sécurité et de défense de l\'Etat ;',
		'TG: porter préjudice aux intérêts stratégiques de l\'Etat ;',
		'TG: porter atteinte à la santé et à la sécurité de la population ;',
		'TG: perturber ou nuire au fonctionnement de l\'économie nationale ;',
		'TG: engendrer une incapacité totale ou partielle de plusieurs infrastructures d\'importance vitale à assurer leurs fonctions essentielles.',
		'G: une incapacité totale ou partielle d\'une infrastructure d\'importance vitale à assurer ses fonctions essentielles ;',
		'G: une incapacité totale d\'une ou plusieurs entités non considérées comme infrastructures d\'importance vitale à assurer leurs fonctions critiques ;',
		'G: des pertes financières importantes pour une ou plusieurs entités ou infrastructures d\'importance vitale',
		'M: une gêne ou perturbation mineure dans les fonctions d\'une infrastructure d\'importance vitale ;',
		'M: une incapacité partielle d\'une ou de plusieurs entités non considérées comme infrastructures d\'importance vitale, à assurer leurs fonctions ;',
		'M: des pertes financières modérées ;',
		'M: ou toute autre conséquence de nature analogue',
		'L: une gêne ou perturbation dans les fonctions de l\'entité non considérée comme infrastructure d\'importance vitale ;',
		'L: des pertes financières limitées ;',
		'L: ou toute autre conséquence de nature analogue.'
	];

	let registreRows: RegistreRow[] = [
		{
			id: '',
			processus_metier: '',
			activite_sous_processus: '',
			designation_actif: '',
			description_actif: '',
			categorie_actif: '',
			type_actif: '',
			proprietaire_actif: '',
			disponibilite: '',
			integrite: '',
			confidentialite: '',
			sensibilite: '',
			commentaire: ''
		}
	];

	// --- Multi-projets : données métier + réglages de méthode par projet ---
	type ProjectData = {
		name: string;
		redactionRows: RedactionRow[];
		diffusionRows: DiffusionRow[];
		versionRows: VersionRow[];
		registreRows: RegistreRow[];
		showRegistreLoi0520: boolean;
		cartoRows: CartoRow[];
		ptrData: Array<Record<string, unknown>>;
		activeSection: SectionId;
		cartoView: 'all' | 'identification' | 'brut' | 'net' | 'ptr';
		cartoVersion: 'A' | 'B';
		// Tables d'aide / échelle PTR / échelles de risque, propres à chaque projet
		periodiciteRows?: Row[];
		complexiteRows?: (Row & { bgColor?: string })[];
		typeActionRows?: (Row & { bgColor?: string })[];
		prioriteRows?: (Row & { bgColor?: string })[];
		dicCriteriaRows?: DICCriteriaRow[];
		dicNiveauxRows?: DICNiveauRow[];
		categoriesActifsRows?: CategorieActifRow[];
		probaRows?: ProbaRow[];
		impactRows?: ImpactRow[];
		impactDefinitionsRows?: ImpactDefinition[];
		frequenceRisqueRows?: (Row & { bgColor?: string })[];
		matriceRisqueRows?: MatriceRow[];
		efficaciteRows?: EfficaciteRow[];
	};
	let activeProjectId = DEFAULT_PROJECT_ID;
	let projects: Record<string, ProjectData> = {};

	// --- Persistence: localStorage (toujours, pour survivre à l’arrêt backend/frontend) + server (partagé) ---
	let lastSavedAt: Date | null = null;
	let saveFeedback: 'idle' | 'saved' | 'restored' = 'idle';
	let saveFeedbackTimeout: ReturnType<typeof setTimeout> | null = null;

	function saveCustomMethodState() {
		try {
			// Toujours lire l’état actuel au moment de la sauvegarde (cartoRows est muté en place par bind:value)
			const state = getFullState();
			// Rotation backup : l’état actuel devient la « version précédente » avant d’écraser
			const previous = localStorage.getItem(METHODE_RISQUE_NEARSECURE_STORAGE_KEY);
			if (previous) localStorage.setItem(METHODE_RISQUE_NEARSECURE_BACKUP_KEY, previous);
			// Sauvegarde locale : garantit la persistance même si le backend est arrêté ou le navigateur fermé
			localStorage.setItem(METHODE_RISQUE_NEARSECURE_STORAGE_KEY, JSON.stringify(state));
			lastSavedAt = new Date();
			// Envoi au serveur pour partage / persistance côté backend (ignoré si backend indisponible)
			fetch('/fe-api/Methode-risque-nearsecure-state', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(state)
			}).catch((e) => console.warn('Could not save custom method state to server:', e));
		} catch (e) {
			console.warn('Could not save custom method state:', e);
		}
	}

	function saveWithFeedback() {
		saveCustomMethodState();
		saveFeedback = 'saved';
		if (saveFeedbackTimeout) clearTimeout(saveFeedbackTimeout);
		saveFeedbackTimeout = setTimeout(() => {
			saveFeedbackTimeout = null;
			saveFeedback = 'idle';
		}, 3000);
	}

	function formatLastSaved(date: Date): string {
		const now = new Date();
		const sec = Math.floor((now.getTime() - date.getTime()) / 1000);
		if (sec < 10) return "à l'instant";
		if (sec < 60) return `il y a ${sec} s`;
		const min = Math.floor(sec / 60);
		if (min < 60) return `il y a ${min} min`;
		const h = Math.floor(min / 60);
		return `il y a ${h} h`;
	}

	function downloadBackupJson() {
		const state = getFullState();
		const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `methode-nearsecure-backup-${new Date().toISOString().slice(0, 10)}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}

	function restorePreviousVersion() {
		try {
			const raw = typeof window !== 'undefined' ? localStorage.getItem(METHODE_RISQUE_NEARSECURE_BACKUP_KEY) : null;
			if (!raw || raw.length < 2) {
				alert('Aucune version précédente disponible.');
				return;
			}
			const state = JSON.parse(raw) as Record<string, unknown>;
			applyFullState(state);
			saveCustomMethodState();
			saveFeedback = 'restored';
			if (saveFeedbackTimeout) clearTimeout(saveFeedbackTimeout);
			saveFeedbackTimeout = setTimeout(() => {
				saveFeedbackTimeout = null;
				saveFeedback = 'idle';
			}, 3000);
		} catch (e) {
			console.warn('Could not restore previous version:', e);
			alert('Impossible de restaurer la version précédente (données invalides).');
		}
	}

	$: hasPreviousVersion = (lastSavedAt, typeof window !== 'undefined') && !!localStorage.getItem(METHODE_RISQUE_NEARSECURE_BACKUP_KEY);

	function loadCustomMethodStateFromStorage() {
		try {
			const raw = localStorage.getItem(METHODE_RISQUE_NEARSECURE_STORAGE_KEY);
			if (!raw) return;
			const state = JSON.parse(raw) as Record<string, unknown>;
			applyFullState(state);
		} catch (e) {
			console.warn('Could not load custom method state from localStorage:', e);
		}
	}

	async function loadCustomMethodState() {
		try {
			const res = await fetch('/fe-api/Methode-risque-nearsecure-state');
			const data = await res.json();
			if (res.ok && data && typeof data === 'object' && Object.keys(data).length > 0) {
				applyFullState(data);
				return;
			}
		} catch (e) {
			// Backend arrêté ou indisponible : charger depuis le localStorage (données conservées)
			console.warn('Could not load custom method state from server:', e);
		}
		// Fallback localStorage (toujours utilisé si le serveur échoue ou renvoie vide)
		loadCustomMethodStateFromStorage();
		// Re-sync : pousser l’état local vers le serveur s’il est de nouveau disponible
		if (Object.keys(projects).length === 0) {
			projects = { [DEFAULT_PROJECT_ID]: getCurrentProjectData() };
			activeProjectId = DEFAULT_PROJECT_ID;
		}
		saveCustomMethodState();
	}

	let persistTimeout: ReturnType<typeof setTimeout> | null = null;
	// Re-run when any of these change so we debounce-save (persists on tab close / refresh + server).
	// Note: cartoRows is NOT reactive to in-place edits (bind:value); cartographie is saved via interval + on section leave.
	$: _persistDeps = [
		redactionRows,
		diffusionRows,
		versionRows,
		registreRows,
		showRegistreLoi0520,
		activeSection,
		cartoView,
		periodiciteRows,
		complexiteRows,
		typeActionRows,
		prioriteRows,
		dicCriteriaRows,
		dicNiveauxRows,
		categoriesActifsRows,
		probaRows,
		impactRows,
		impactDefinitionsRows,
		frequenceRisqueRows,
		matriceRisqueRows,
		efficaciteRows,
		ptrData
	];
	$: if (typeof window !== 'undefined' && _persistDeps) {
		if (persistTimeout) clearTimeout(persistTimeout);
		persistTimeout = setTimeout(() => {
			persistTimeout = null;
			saveCustomMethodState();
		}, 1500);
	}

	// When leaving cartographie or controle-document section, save immediately so bind:value mutations are persisted
	let _prevSection: SectionId = activeSection;
	$: {
		if (typeof window !== 'undefined' && _prevSection !== activeSection) {
			if (_prevSection === 'cartographie-risques' || _prevSection === 'controle-document') {
				saveCustomMethodState();
			}
		}
		_prevSection = activeSection;
	}

	/** Export en fichier Excel — même présentation et couleurs qu'à l'écran. N'inclut que les feuilles sélectionnées dans exportExcelSheets. */
	async function exportToExcel() {
		const selectedSheets = new Set(EXPORT_EXCEL_SHEET_IDS.filter((id) => exportExcelSheets[id]));
		if (selectedSheets.size === 0) {
			alert('Veuillez sélectionner au moins une feuille à exporter.');
			return;
		}
		const wb = new ExcelJS.Workbook();
		wb.creator = 'CISO Assistant - La méthode NearSecure';

		// --- Feuille 1 : Contrôle du document (structure identique à la page) ---
		if (selectedSheets.has('controle-document')) {
		const wsControle = wb.addWorksheet('Controle du document', { views: [{ showGridLines: true }] });
		wsControle.addRow(['Contrôle du document']).font = { bold: true, size: 14 };
		wsControle.addRow([]);
		wsControle.addRow(['1. Rédaction du document']).font = { bold: true };
		const rowRedacTitle = wsControle.addRow(['RÉDACTION DU DOCUMENT']);
		applyTitleRow(rowRedacTitle);
		const rowRedacHeader = wsControle.addRow(['Rôle', 'Nom', 'Fonction', 'Date']);
		applyHeaderRow(wsControle, rowRedacHeader, 'FF4B5563'); // bg-gray-600 comme à l'écran
		redactionRows.forEach((r) => {
			const row = wsControle.addRow([r.role, r.nom, r.fonction, r.date]);
			applyDataRowBorder(wsControle, row);
			// Première colonne (rôle) : fond gris, texte blanc comme à l'écran
			const firstCell = row.getCell(1);
			applyCellStyle(firstCell, { fill: 'FF4B5563', border: true, fontColor: 'FFFFFFFF', bold: true });
		});
		wsControle.addRow([]);
		wsControle.addRow(['2. Diffusion du document']).font = { bold: true };
		const rowDiffTitle = wsControle.addRow(['DIFFUSION DU DOCUMENT']);
		applyTitleRow(rowDiffTitle);
		const rowDiffHeader = wsControle.addRow(['Nom', 'Entité / Fonction', 'Date']);
		applyHeaderRow(wsControle, rowDiffHeader, 'FF4B5563');
		diffusionRows.forEach((r) => {
			const row = wsControle.addRow([r.nom, r.entite_fonction, r.date]);
			applyDataRowBorder(wsControle, row);
		});
		wsControle.addRow([]);
		wsControle.addRow(['3. Contrôle des versions du document']).font = { bold: true };
		const rowVersTitle = wsControle.addRow(['CONTRÔLE DES VERSIONS DU DOCUMENT']);
		applyTitleRow(rowVersTitle);
		const rowVersHeader = wsControle.addRow(['Version', 'Date', 'Modification']);
		applyHeaderRow(wsControle, rowVersHeader, 'FF4B5563');
		versionRows.forEach((r) => {
			const row = wsControle.addRow([r.version, r.date, r.modification]);
			applyDataRowBorder(wsControle, row);
		});
		}

		// --- Feuille 2 : Registre de classification (colonnes et couleurs comme à l'écran) ---
		if (selectedSheets.has('registre-classification')) {
		const wsRegistre = wb.addWorksheet('Registre de classification', { views: [{ showGridLines: true }] });
		wsRegistre.addRow(['Registre de classification des actifs informationnels']).font = { bold: true, size: 14 };
		wsRegistre.addRow([]);
		// Ligne des sous-titres (identique à la page : jaune clair)
		const registreSubHeaders = [
			'Processus métier', 'Activité/Sous‑processus', 'Désignation de l\'actif informationnel', 'Description de l\'actif',
			'Catégorie de l\'actif', 'Type de l\'actif', 'Propriétaire de l\'actif',
			'Besoin en terme de Disponibilité', 'Besoin en terme d\'Intégrité', 'Besoin en terme de Confidentialité', 'Sensibilité de l\'actif'
		];
		if (showRegistreLoi0520) {
			registreSubHeaders.push('Impact Disponibilité', 'Impact Intégrité', 'Impact Confidentialité', 'Sensibilité (réf. loi 05.20)', 'Confidentialité (décret 05-20)');
		}
		registreSubHeaders.push('Commentaire');
		const fullHeaders = ['ID', ...registreSubHeaders];
		const rowRegHeader = wsRegistre.addRow(fullHeaders);
		rowRegHeader.eachCell((cell, colNumber) => {
			cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE047' } }; // bg-yellow-300
			cell.font = { bold: true, color: { argb: 'FF000000' } };
			cell.border = EXCEL_BORDER_THIN;
			cell.alignment = { vertical: 'middle', wrapText: true };
		});
		registreRows.forEach((r) => {
			const rowData: (string | number)[] = [
				r.id ?? '',
				r.processus_metier, r.activite_sous_processus, r.designation_actif, r.description_actif,
				r.categorie_actif, getTypeActifLabel(r.type_actif), r.proprietaire_actif,
				r.disponibilite, r.integrite, r.confidentialite, r.sensibilite
			];
			if (showRegistreLoi0520) {
				rowData.push(r.impactDispo0520 ?? '', r.impactIntegrite0520 ?? '', r.impactConfid0520 ?? '', getSensibiliteClasse0520(r), getConfidentialite0520(r));
			}
			rowData.push(r.commentaire ?? '');
			const row = wsRegistre.addRow(rowData);
			applyDataRowBorder(wsRegistre, row);
			// Couleurs D/I/C/Sensibilité (colonnes 9-12) selon getNiveauBesoinBg
			const dicCols = [9, 10, 11, 12];
			const dicVals = [r.disponibilite, r.integrite, r.confidentialite, r.sensibilite];
			dicCols.forEach((colIndex, i) => {
				const tw = getNiveauBesoinBg(dicVals[i]);
				const argb = tailwindToExcelArgb(tw);
				if (argb) applyCellStyle(row.getCell(colIndex), { fill: argb, border: true });
			});
			if (showRegistreLoi0520) {
				const hexDispo = getLoi0520ImpactBg(r.impactDispo0520);
				const hexInteg = getLoi0520ImpactBg(r.impactIntegrite0520);
				const hexConf = getLoi0520ImpactBg(r.impactConfid0520);
				const sensClasse = getSensibiliteClasse0520(r);
				const hexSens = getSensibiliteClasse0520Bg(sensClasse);
				if (hexToExcelArgb(hexDispo)) applyCellStyle(row.getCell(13), { fill: hexToExcelArgb(hexDispo)!, border: true });
				if (hexToExcelArgb(hexInteg)) applyCellStyle(row.getCell(14), { fill: hexToExcelArgb(hexInteg)!, border: true });
				if (hexToExcelArgb(hexConf)) applyCellStyle(row.getCell(15), { fill: hexToExcelArgb(hexConf)!, border: true });
				if (hexToExcelArgb(hexSens)) applyCellStyle(row.getCell(16), { fill: hexToExcelArgb(hexSens)!, border: true });
				// Colonne 17 = Confidentialité (décret) : amber-50
				applyCellStyle(row.getCell(17), { fill: 'FFFFFBEB', border: true });
			}
		});
		}

		// --- Feuille 3 : Aide-Classification (structure identique à la page) ---
		if (selectedSheets.has('aide-classification')) {
		const wsAideClass = wb.addWorksheet('Aide-Classification', { views: [{ showGridLines: true }] });
		wsAideClass.addRow(['Aide-Classification']).font = { bold: true, size: 14 };
		wsAideClass.addRow([]);
		wsAideClass.addRow(['Tableau 1 – Disponibilité, Intégrité, Confidentialité (définitions générales)']).font = { bold: true };
		// Comme à l'écran : une ligne d'en-têtes = les 3 critères (chaque cellule avec sa couleur), une ligne = les définitions
		const rowCritNames = wsAideClass.addRow(dicCriteriaRows.map((r) => r.critere));
		applyDataRowBorder(wsAideClass, rowCritNames);
		rowCritNames.eachCell((cell, colNumber) => {
			const argb = tailwindToExcelArgb(dicCriteriaRows[colNumber - 1]?.bgColor);
			if (argb) applyCellStyle(cell, { fill: argb, border: true, bold: true });
		});
		const rowCritDefs = wsAideClass.addRow(dicCriteriaRows.map((r) => stripHtml(r.definition)));
		applyDataRowBorder(wsAideClass, rowCritDefs);
		wsAideClass.addRow([]);
		wsAideClass.addRow(['Tableau 1.2 – Niveaux de valeur par critère (D / I / C)']).font = { bold: true };
		const rowDicNivHeader = wsAideClass.addRow(['Valeur', 'Disponibilité (D)', 'Intégrité (I)', 'Confidentialité (C)']);
		rowDicNivHeader.eachCell((cell) => {
			cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBAE6FD' } }; // bg-sky-200
			cell.font = { bold: true, color: { argb: 'FF000000' } };
			cell.border = EXCEL_BORDER_THIN;
			cell.alignment = { vertical: 'middle', wrapText: true };
		});
		dicNiveauxRows.forEach((r) => {
			const row = wsAideClass.addRow([
				r.valeur,
				stripHtml(r.disponibilite),
				stripHtml(r.integrite),
				stripHtml(r.confidentialite)
			]);
			applyDataRowBorder(wsAideClass, row);
			const argb = tailwindToExcelArgb(r.bgColor);
			if (argb) {
				row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
				row.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
				row.getCell(1).border = EXCEL_BORDER_THIN;
			}
		});
		wsAideClass.addRow([]);
		wsAideClass.addRow(['Tableau 2 – Catégories d\'actifs']).font = { bold: true };
		const headerTable2 = wsAideClass.addRow(['Catégories d\'actifs', "Type d'actif"]);
		headerTable2.eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF87CEEB' } }; c.border = EXCEL_BORDER_THIN; });
		categoriesActifsRows.forEach((c) => {
			const lib = typeof c === 'string' ? c : (c.libelle ?? '');
			const typ = typeof c === 'string' ? '' : (c.type_actif ?? '');
			const row = wsAideClass.addRow([lib, typ]);
			applyDataRowBorder(wsAideClass, row);
		});

		// --- Aide-Classification : Classification selon la loi n° 05-20 ---
		wsAideClass.addRow([]);
		wsAideClass.addRow(['Classification selon la loi n° 05-20']).font = { bold: true, size: 12 };
		wsAideClass.addRow(['Tableau 1 — Échelle qualitative']).font = { bold: true };
		const rowLoi1Title = wsAideClass.addRow(["Echelle d'impact selon la loi n° 05.20 et son décret d'application"]);
		rowLoi1Title.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE36C0A' } };
		rowLoi1Title.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
		rowLoi1Title.getCell(1).border = EXCEL_BORDER_THIN;
		rowLoi1Title.getCell(1).alignment = { vertical: 'middle', wrapText: true };
		wsAideClass.addRow(["Si un incident de cybersécurité portant sur la confidentialité, la disponibilité ou l'intégrité d'un actif informationnel pourrait :"]);
		applyDataRowBorder(wsAideClass, wsAideClass.lastRow!);
		wsAideClass.addRow([]);
		const rowLoi1Header = wsAideClass.addRow(['Valeur', "Un incident cybersécurité peut :"]);
		rowLoi1Header.eachCell((c) => {
			c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE36C0A' } };
			c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
			c.border = EXCEL_BORDER_THIN;
			c.alignment = { vertical: 'middle', wrapText: true };
		});
		const loi0520Qualitative = [
			['Très Grave', "- nuire au maintien des capacités de sécurité et de défense de l'Etat ;\n- porter préjudice aux intérêts stratégiques de l'Etat ;\n- porter atteinte à la santé et à la sécurité de la population ;\n- perturber ou nuire au fonctionnement de l'économie nationale ;\n- engendrer une incapacité totale ou partielle de plusieurs infrastructures d'importance vitale à assurer leurs fonctions essentielles."],
			['Grave', "- une incapacité totale ou partielle d'une infrastructure d'importance vitale à assurer ses fonctions essentielles ;\n- une incapacité totale d'une ou plusieurs entités non considérées comme infrastructures d'importance vitale à assurer leurs fonctions critiques ;\n- des pertes financières importantes pour une ou plusieurs entités ou infrastructures d'importance vitale"],
			['Modéré', "- une gêne ou perturbation mineure dans les fonctions d'une infrastructure d'importance vitale ;\n- une incapacité partielle d'une ou de plusieurs entités non considérées comme infrastructures d'importance vitale, à assurer leurs fonctions ;\n- des pertes financières modérées ;\n- ou toute autre conséquence de nature analogue."],
			['Limité', "- une gêne ou perturbation dans les fonctions de l'entité non considérée comme infrastructure d'importance vitale ;\n- des pertes financières limitées ;\n- ou toute autre conséquence de nature analogue."]
		];
		loi0520Qualitative.forEach(([val, desc]) => {
			const r = wsAideClass.addRow([val, desc]);
			applyDataRowBorder(wsAideClass, r);
			r.getCell(1).font = { bold: true };
		});
		wsAideClass.addRow([]);
		wsAideClass.addRow(['Tableau 2 — Échelle numérique avec code couleur']).font = { bold: true };
		const rowLoi2Header = wsAideClass.addRow(['VALEUR', "Echelle d'impact du référentiel fixé par la loi n° 05.20 et son décret d'application"]);
		rowLoi2Header.eachCell((c) => {
			c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } };
			c.font = { bold: true, color: { argb: 'FF000000' } };
			c.border = EXCEL_BORDER_THIN;
			c.alignment = { vertical: 'middle', wrapText: true };
		});
		const loi0520Numerique = [
			[4, "TG: nuire au maintien des capacités de sécurité et de défense de l'Etat ;"],
			[4, "TG: porter préjudice aux intérêts stratégiques de l'Etat ;"],
			[4, "TG: porter atteinte à la santé et à la sécurité de la population ;"],
			[4, "TG: perturber ou nuire au fonctionnement de l'économie nationale ;"],
			[4, "TG: engendrer une incapacité totale ou partielle de plusieurs infrastructures d'importance vitale à assurer leurs fonctions essentielles."],
			[3, "G: une incapacité totale ou partielle d'une infrastructure d'importance vitale à assurer ses fonctions essentielles ;"],
			[3, "G: une incapacité totale d'une ou plusieurs entités non considérées comme infrastructures d'importance vitale à assurer leurs fonctions critiques ;"],
			[3, "G: des pertes financières importantes pour une ou plusieurs entités ou infrastructures d'importance vitale"],
			[2, "M: une gêne ou perturbation mineure dans les fonctions d'une infrastructure d'importance vitale ;"],
			[2, "M: une incapacité partielle d'une ou de plusieurs entités non considérées comme infrastructures d'importance vitale, à assurer leurs fonctions ;"],
			[2, "M: des pertes financières modérées ;"],
			[2, "M: ou toute autre conséquence de nature analogue"],
			[1, "L: une gêne ou perturbation dans les fonctions de l'entité non considérée comme infrastructure d'importance vitale ;"],
			[1, "L: des pertes financières limitées ;"],
			[1, "L: ou toute autre conséquence de nature analogue."]
		];
		const loi0520Colors = ['FFF87171', 'FFF87171', 'FFF87171', 'FFF87171', 'FFF87171', 'FFFB923C', 'FFFB923C', 'FFFB923C', 'FFFFFF00', 'FFFFFF00', 'FFFFFF00', 'FFFFFF00', 'FFA1FB7D', 'FFA1FB7D', 'FFA1FB7D'];
		loi0520Numerique.forEach(([num, text], idx) => {
			const r = wsAideClass.addRow([num, text]);
			applyDataRowBorder(wsAideClass, r);
			r.getCell(1).font = { bold: true };
			if (loi0520Colors[idx]) r.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: loi0520Colors[idx] } };
		});
		}

		// --- Feuille 4 : Cartographie des risques (colonnes selon vue SANS Efficacité / AVEC Efficacité) ---
		if (selectedSheets.has('cartographie-risques')) {
		const impactLabels = impactDefinitionsRows.map((d) => d.libelle);
		const nImp = impactDefinitionsRows.length;
		const isCartoVersionA = cartoVersion === 'A';

		// Colonnes à inclure selon la vue choisie (indices 1-based)
		const endId = 20;
		const endBrut = cartoColEndBrut;
		const endNet = cartoColEndNet;
		const endRes = cartoColEndRes;
		let includedCols: number[];
		if (exportCartoView === 'all') {
			includedCols = []; // rempli après numCartoCols
		} else if (exportCartoView === 'identification') {
			includedCols = Array.from({ length: endId }, (_, i) => i + 1);
		} else if (exportCartoView === 'brut') {
			includedCols = Array.from({ length: endBrut }, (_, i) => i + 1);
		} else if (exportCartoView === 'net') {
			includedCols = Array.from({ length: endNet }, (_, i) => i + 1);
		} else {
			// ptr: identifiants 1-5 + PTR et Risque Résiduel (endNet+1 à endRes)
			includedCols = [1, 2, 3, 4, 5];
			for (let c = endNet + 1; c <= endRes; c++) includedCols.push(c);
		}

		// En-têtes et libellés identiques à la plateforme (vue cartographie)
		const cartoHeaders = isCartoVersionA
			? [
					'Entité', 'Domaine / Processus', 'Activités', 'Code Risque', 'Description du scénario du Risque', 'Mesure ISO27001, annexe A',
					'Famille de risque', 'Source', 'Famille de causes', 'Propriétaire du risque',
					'Matériel informatique', 'Application', 'Equipements sécurité', 'Equipements réseaux', 'Ressources humaines', 'Document', 'Données',
					'D', 'I', 'C',
					'D', 'I', 'C',
					'Criticité de l\'actif - Besoin en SSI', ...impactLabels, 'Gravité des impacts', 'Probabilité d\'Occurrence', 'I*P*C', 'Signification du risque brut',
					'Description du Dispositif de Maitrise des Risques (DMR) existant',
					'Criticité de l\'actif - Besoin en SSI', 'Gravité des impacts', 'Probabilité d\'Occurrence', 'I*P*C', 'Signification du risque net',
					'Décision', 'Action à mettre en place',
					'Criticité de l\'actif - Besoin en SSI', 'Gravité des impacts', 'Probabilité d\'occurrence', 'I*P*C', 'Niveau du risque résiduel'
				]
			: [
					'Entité', 'Domaine / Processus', 'Activités', 'Code Risque', 'Description du scénario du Risque', 'Mesure ISO27001, annexe A',
					'Famille de risque', 'Source', 'Famille de causes', 'Propriétaire du risque',
					'Matériel informatique', 'Application', 'Equipements sécurité', 'Equipements réseaux', 'Ressources humaines', 'Document', 'Données',
					'D', 'I', 'C',
					'D', 'I', 'C',
					'Criticité de l\'actif - Besoin en SSI', ...impactLabels, 'Gravité des impacts', 'Probabilité d\'Occurrence', 'I*P*C', 'Signification du risque brut',
					'Description du Dispositif de Maitrise des Risques (DMR) existant', 'Efficacité DMR', 'Niveau d\'efficacité', 'Niveau de risque', 'Signification du risque net', 'Décision',
					'Action à mettre en place', 'Efficacité PTR', 'Pourcentage d\'efficacité', 'Niveau de risque', 'Niveau du risque résiduel'
				];

		// Regroupements identiques à la plateforme : Processus (3), Identification (17), Risque Brut (jusqu'à Signification du risque brut), DMR (1), Risque Net, PTR (2), Risque Résiduel
		const cartoSectionColspans = isCartoVersionA
			? [
					3,   // Cartographie des Processus
					17,  // Identification des risques inhérents (7 ident. + 7 catégories actifs + 3 critères D/I/C)
					3 + 1 + nImp + 4,  // Évaluation de la Criticité du Risque Brut (Impact DIC 3 + Criticité 1 + nImp impacts + Gravité, Proba, I*P*C, Signification du risque brut 4)
					1,   // Détermination du degré d'exposition aux risques (DMR)
					5,   // Évaluation de la Criticité du Risque Net
					2,   // Plan de traitement des risques (PTR)
					5    // Évaluation du Risque Résiduel
				]
			: [
					3,
					20,  // Identification (10 ident. + 7 catégories actifs + 3 critères D/I/C)
					1 + nImp + 4,  // Évaluation de la Criticité du Risque Brut (Criticité 1 + nImp impacts + Gravité, Proba, I*P*C, Signification du risque brut 4) — s'arrête à Signification du risque brut
					1, 4, 2, 4
				];

		const cartoSectionLabels = isCartoVersionA
			? [
					'Cartographie des Processus',
					'Identification des risques inhérents',
					'Évaluation de la Criticité du Risque Brut',
					'Détermination du degré d\'exposition aux risques',
					'Évaluation de la Criticité du Risque Net',
					'Plan de traitement des risques (PTR)',
					'Évaluation du Risque Résiduel'
				]
			: [
					'Cartographie des Processus',
					'Identification des risques inhérents',
					'Évaluation de la Criticité du Risque Brut',
					'Détermination du degré d\'exposition aux risques',
					'Évaluation de la Criticité du Risque Net',
					'Plan de traitement des risques (PTR)',
					'Évaluation du Risque Résiduel'
				];

		// Couleurs de sections (alignées sur l'interface) : blanc, teal-700 (Identification), jaune, teal-600 (DMR), jaune, gris, jaune
		const cartoSectionFills = ['FFFFFFFF', 'FF0F766E', 'FFFACC15', 'FF0D9488', 'FFFACC15', 'FF4B5563', 'FFFACC15'];

		const numCartoCols = cartoHeaders.length;
		if (exportCartoView === 'all') includedCols = Array.from({ length: numCartoCols }, (_, i) => i + 1);

		const cartoViewPartial = exportCartoView !== 'all';
		const numCartoColsExport = cartoViewPartial ? includedCols.length : numCartoCols;
		const filteredHeaders = cartoViewPartial ? includedCols.map((c) => cartoHeaders[c - 1]) : cartoHeaders;

		const wsCarto = wb.addWorksheet('Cartographie des risques', { views: [{ showGridLines: true }] });
		const rowCartoTitle = wsCarto.addRow(['CARTOGRAPHIE DES RISQUES DE SECURITÉ DES SYSTÈMES D\'INFORMATION' + (cartoViewPartial ? ` (Vue : ${EXPORT_CARTO_VIEW_LABELS[exportCartoView]})` : '')]);
		rowCartoTitle.getCell(1).font = { bold: true, size: 14 };
		rowCartoTitle.getCell(1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
		if (numCartoColsExport > 1) wsCarto.mergeCells(1, 1, 1, numCartoColsExport);
		if (!cartoViewPartial) {
		let colAcc = 0;
		const rowCartoSections = wsCarto.addRow(cartoHeaders.map(() => ''));
		cartoSectionColspans.forEach((span, i) => {
			const startCol = colAcc + 1;
			const endCol = colAcc + span;
			colAcc = endCol;
			if (endCol > startCol) wsCarto.mergeCells(2, startCol, 2, endCol);
			const cell = rowCartoSections.getCell(startCol);
			cell.value = cartoSectionLabels[i];
			cell.font = { bold: true };
			cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
			cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cartoSectionFills[i] } };
			cell.border = EXCEL_BORDER_THIN;
			if (i === 1 || i === 3) cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };  // Identification + DMR (fond teal, texte blanc)
		});
		// Sous-regroupements (version A et B) : Catégorie d'actifs (11-17), Critères d'impact (18-20), Impact DIC (21-23)
		if (numCartoCols >= 23) {
			const rowCartoSubGroup = wsCarto.addRow(Array(numCartoCols).fill(''));
			rowCartoSubGroup.eachCell((cell) => { cell.border = EXCEL_BORDER_THIN; });
			// Catégorie d'actifs informationnels directement concernés (au sein de "Identification des risques inhérents")
			wsCarto.mergeCells(3, 11, 3, 17);
			const cellCatActifs = rowCartoSubGroup.getCell(11);
			cellCatActifs.value = 'Catégorie d\'actifs informationnels directement concernés';
			cellCatActifs.font = { bold: true, color: { argb: 'FFFFFFFF' } };
			cellCatActifs.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB91C1C' } };
			cellCatActifs.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
			cellCatActifs.border = EXCEL_BORDER_THIN;
			// Critères d'impact : D, I, C (au sein de "Identification des risques inhérents")
			wsCarto.mergeCells(3, 18, 3, 20);
			const cellCritImpact = rowCartoSubGroup.getCell(18);
			cellCritImpact.value = 'Critères d\'impact';
			cellCritImpact.font = { bold: true, color: { argb: 'FF000000' } };
			cellCritImpact.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFACC15' } };
			cellCritImpact.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
			cellCritImpact.border = EXCEL_BORDER_THIN;
			// Impact DIC : D, I, C (au sein de "Évaluation de la Criticité du Risque Brut")
			wsCarto.mergeCells(3, 21, 3, 23);
			const cellImpactDIC = rowCartoSubGroup.getCell(21);
			cellImpactDIC.value = 'Impact DIC';
			cellImpactDIC.font = { bold: true, color: { argb: 'FF000000' } };
			cellImpactDIC.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFACC15' } };
			cellImpactDIC.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
			cellImpactDIC.border = EXCEL_BORDER_THIN;
			// Pour les autres colonnes (1-10 et 24 à la fin), même couleur que la ligne d'en-têtes en dessous
			const W = 'FFFFFFFF', B = 'FF000000';
			for (let c = 1; c <= numCartoCols; c++) {
				if (c >= 11 && c <= 23) continue;
				let fill: string, fontColor: string;
				if (c <= 3) { fill = 'FF4B5563'; fontColor = W; }
				else if (c <= 10) { fill = 'FF0F766E'; fontColor = W; }
				else if (isCartoVersionA) {
					if (c === 24 || (c >= 25 + nImp && c <= 28 + nImp) || (c >= 30 + nImp && c <= 34 + nImp) || (c >= 37 + nImp)) { fill = 'FFFACC15'; fontColor = B; }
					else if (c <= 24 + nImp) { fill = 'FFEA580C'; fontColor = W; }
					else if (c === 29 + nImp) { fill = 'FF0F766E'; fontColor = W; }
					else { fill = 'FF4B5563'; fontColor = W; }
				} else {
					if (c === 24 || (c >= 25 + nImp && c <= 28 + nImp) || (c >= 30 + nImp && c <= 33 + nImp) || (c >= 36 + nImp)) { fill = 'FFFACC15'; fontColor = B; }
					else if (c <= 24 + nImp) { fill = 'FFEA580C'; fontColor = W; }
					else if (c === 29 + nImp) { fill = 'FF0F766E'; fontColor = W; }
					else if (c >= 34 + nImp && c <= 35 + nImp) { fill = 'FF4B5563'; fontColor = W; }
					else { fill = 'FFFACC15'; fontColor = B; }
				}
				const cell = rowCartoSubGroup.getCell(c);
				cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
				cell.font = { bold: true, color: { argb: fontColor } };
				cell.border = EXCEL_BORDER_THIN;
			}
		}
		}
		// Couleurs d'en-têtes (calculées pour toutes les colonnes, puis filtrées si vue partielle)
		const W = 'FFFFFFFF', B = 'FF000000';
		const cartoHeaderColors: { fill: string; font: string }[] = [];
		if (isCartoVersionA) {
			for (let c = 1; c <= numCartoCols; c++) {
				if (c <= 3) cartoHeaderColors.push({ fill: 'FF4B5563', font: W }); // gray-600
				else if (c <= 10) cartoHeaderColors.push({ fill: 'FF0F766E', font: W }); // teal-700
				else if (c <= 17) cartoHeaderColors.push({ fill: 'FF0891B2', font: W }); // cyan-600
				else if (c <= 20) cartoHeaderColors.push({ fill: 'FF16A34A', font: W }); // green-600
				else if (c <= 23) cartoHeaderColors.push({ fill: 'FFEA580C', font: W }); // orange-600
				else if (c === 24 || (c >= 25 + nImp && c <= 28 + nImp) || (c >= 30 + nImp && c <= 34 + nImp) || (c >= 37 + nImp)) cartoHeaderColors.push({ fill: 'FFFACC15', font: B }); // yellow-400
				else if (c <= 24 + nImp) cartoHeaderColors.push({ fill: 'FFEA580C', font: W });
				else if (c === 29 + nImp) cartoHeaderColors.push({ fill: 'FF0F766E', font: W });
				else cartoHeaderColors.push({ fill: 'FF4B5563', font: W }); // PTR
			}
		} else {
			for (let c = 1; c <= numCartoCols; c++) {
				if (c <= 3) cartoHeaderColors.push({ fill: 'FF4B5563', font: W });
				else if (c <= 10) cartoHeaderColors.push({ fill: 'FF0F766E', font: W });
				else if (c <= 17) cartoHeaderColors.push({ fill: 'FF0891B2', font: W }); // Catégories actifs
				else if (c <= 20) cartoHeaderColors.push({ fill: 'FF16A34A', font: W }); // Critères D,I,C
				else if (c <= 23) cartoHeaderColors.push({ fill: 'FFEA580C', font: W }); // Impact DIC
				else if (c === 24 || (c >= 25 + nImp && c <= 28 + nImp) || (c >= 30 + nImp && c <= 33 + nImp) || (c >= 36 + nImp)) cartoHeaderColors.push({ fill: 'FFFACC15', font: B });
				else if (c <= 24 + nImp) cartoHeaderColors.push({ fill: 'FFEA580C', font: W });
				else if (c === 29 + nImp) cartoHeaderColors.push({ fill: 'FF0F766E', font: W }); // DMR
				else if (c <= 35 + nImp && c >= 34 + nImp) cartoHeaderColors.push({ fill: 'FF4B5563', font: W }); // PTR (34+nImp, 35+nImp)
				else cartoHeaderColors.push({ fill: 'FFFACC15', font: B });
			}
		}
		const rowCartoHeader = wsCarto.addRow(filteredHeaders);
		if (cartoViewPartial) {
			rowCartoHeader.eachCell((cell, colNumber) => {
				const x = cartoHeaderColors[includedCols[colNumber - 1] - 1];
				if (x) {
					cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: x.fill } };
					cell.font = { bold: true, color: { argb: x.font } };
					cell.border = EXCEL_BORDER_THIN;
					cell.alignment = { vertical: 'middle', wrapText: true };
				}
			});
		} else {
			applyHeaderRow(wsCarto, rowCartoHeader, 'FF0284C7');
			cartoHeaderColors.forEach((x, i) => {
				if (i >= numCartoCols) return;
				const cell = rowCartoHeader.getCell(i + 1);
				cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: x.fill } };
				cell.font = { ...(cell.font as object), color: { argb: x.font }, bold: true } as ExcelJS.Font;
			});
		}

		const FILL_OUI = 'FFDCFCE7';
		const FILL_JAUNE_200 = 'FFFEF08A';
		let prevPartExport = 0;
		cartoRows.forEach((row, i) => {
			const part = getPartFromCodeRisque(row.codeRisque) || (i > 0 ? getPartFromCodeRisque(cartoRows[i - 1].codeRisque) : 1) || 1;
			if (part !== prevPartExport) {
				const rowPart = wsCarto.addRow([CARTO_PART_TITLES[part] || 'Autres']);
				rowPart.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
				rowPart.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D9488' } };
				rowPart.getCell(1).border = EXCEL_BORDER_THIN;
				rowPart.getCell(1).alignment = { vertical: 'middle', wrapText: true };
				if (numCartoColsExport > 1) wsCarto.mergeCells(rowPart.number, 1, rowPart.number, numCartoColsExport);
				prevPartExport = part;
			}
			const impacts = getRowImpacts(row);
			const dicDVal = row.dicD ? 'X' : '';
			const dicIVal = row.dicI ? 'X' : '';
			const dicCVal = row.dicC ? 'X' : '';
			const signifBrut = getNiveauBrut(row);
			const signifNet = isCartoVersionA ? getNiveauNet(row) : getSignificationRisqueNetB(row);
			const signifResiduel = isCartoVersionA ? getNiveauResiduel(row) : getNiveauFromIpc(getNiveauRisqueResiduelB(row));

			const rowDataFull = isCartoVersionA
				? [
						row.entite ?? '', row.domaineProcessus ?? '', row.activites ?? '', row.codeRisque ?? '',
						row.descriptionScenario ?? '', row.mesureISO ?? '', row.familleRisque ?? '', row.source ?? '',
						row.familleCauses ?? '', row.proprietaireRisque ?? '',
						row.actifMateriel ? 'X' : '', row.actifApplication ? 'X' : '', row.actifEquipementsSecurite ? 'X' : '', row.actifEquipementsReseaux ? 'X' : '', row.actifRessourcesHumaines ? 'X' : '', row.actifDocument ? 'X' : '', row.actifDonnees ? 'X' : '',
						dicDVal, dicIVal, dicCVal,
						row.impactD ?? '', row.impactI ?? '', row.impactC ?? '',
						getCriticite(row) ?? '', ...impacts, getGravite(row) ?? '', row.probabilite ?? '', getIpcBrut(row) ?? '', signifBrut,
						row.dispositifMaitrise ?? '',
						getCriticite(row) ?? '', row.graviteNet ?? '', row.probabiliteNet ?? '', getIpcNet(row) ?? '', signifNet,
						row.decision ?? '', row.actionPTR ?? '',
						getCriticite(row) ?? '', row.impactResiduel ?? '', row.vraisemblanceResiduel ?? '', getIpcResiduel(row) ?? '', signifResiduel
					]
				: [
						row.entite ?? '', row.domaineProcessus ?? '', row.activites ?? '', row.codeRisque ?? '',
						row.descriptionScenario ?? '', row.mesureISO ?? '', row.familleRisque ?? '', row.source ?? '',
						row.familleCauses ?? '', row.proprietaireRisque ?? '',
						row.actifMateriel ? 'X' : '', row.actifApplication ? 'X' : '', row.actifEquipementsSecurite ? 'X' : '', row.actifEquipementsReseaux ? 'X' : '', row.actifRessourcesHumaines ? 'X' : '', row.actifDocument ? 'X' : '', row.actifDonnees ? 'X' : '',
						dicDVal, dicIVal, dicCVal,
						row.impactD ?? '', row.impactI ?? '', row.impactC ?? '',
						getCriticite(row) ?? '', ...impacts, getGravite(row) ?? '', row.probabilite ?? '', getIpcBrut(row) ?? '', signifBrut,
						row.dispositifMaitrise ?? '', row.efficaciteDMR ?? '', getNiveauEfficaciteLabel(row.efficaciteDMR) || '', formatNiveauRisqueNetBDisplay(row), signifNet,
						row.decision ?? '', row.actionPTR ?? '',
						row.efficacitePTR ?? '', getSignificationEfficacitePTRDisplay(row.efficacitePTR), formatNiveauRisqueResiduelBDisplay(row), signifResiduel
					];
			const rowData = cartoViewPartial ? includedCols.map((c) => rowDataFull[c - 1]) : rowDataFull;
			const r = wsCarto.addRow(rowData);
			applyDataRowBorder(wsCarto, r);

			if (!cartoViewPartial && isCartoVersionA) {
				// Catégories d'actifs (11-17)
				if (row.actifMateriel) applyCellStyle(r.getCell(11), { fill: FILL_OUI, border: true });
				if (row.actifApplication) applyCellStyle(r.getCell(12), { fill: FILL_OUI, border: true });
				if (row.actifEquipementsSecurite) applyCellStyle(r.getCell(13), { fill: FILL_OUI, border: true });
				if (row.actifEquipementsReseaux) applyCellStyle(r.getCell(14), { fill: FILL_OUI, border: true });
				if (row.actifRessourcesHumaines) applyCellStyle(r.getCell(15), { fill: FILL_OUI, border: true });
				if (row.actifDocument) applyCellStyle(r.getCell(16), { fill: FILL_OUI, border: true });
				if (row.actifDonnees) applyCellStyle(r.getCell(17), { fill: FILL_OUI, border: true });
				// DIC (18-20)
				if (row.dicD) applyCellStyle(r.getCell(18), { fill: FILL_OUI, border: true });
				if (row.dicI) applyCellStyle(r.getCell(19), { fill: FILL_OUI, border: true });
				if (row.dicC) applyCellStyle(r.getCell(20), { fill: FILL_OUI, border: true });
				// Criticité, Gravité (24, 25+nImp), Proba (26+nImp), I*P*C (27+nImp)
				applyCellStyle(r.getCell(24), { fill: FILL_JAUNE_200, border: true });
				applyCellStyle(r.getCell(25 + nImp), { fill: FILL_JAUNE_200, border: true });
				applyCellStyle(r.getCell(26 + nImp), { fill: FILL_JAUNE_200, border: true });
				applyCellStyle(r.getCell(27 + nImp), { fill: 'FFFB923C', border: true }); // orange-400 I*P*C
				const colSignifBrutA = 28 + nImp;
				const argbBrut = tailwindToExcelArgb(getNiveauRisqueBg(signifBrut));
				if (argbBrut) applyCellStyle(r.getCell(colSignifBrutA), { fill: argbBrut, border: true });
				// Risque Net: Criticité (30+nImp), Gravité nette (31), Proba nette (32), I*P*C net (33), Signif net (34)
				applyCellStyle(r.getCell(30 + nImp), { fill: FILL_JAUNE_200, border: true });
				applyCellStyle(r.getCell(31 + nImp), { fill: FILL_JAUNE_200, border: true });
				applyCellStyle(r.getCell(32 + nImp), { fill: FILL_JAUNE_200, border: true });
				applyCellStyle(r.getCell(33 + nImp), { fill: 'FFFB923C', border: true });
				const colSignifNetA = 34 + nImp;
				const argbNet = tailwindToExcelArgb(getNiveauRisqueBg(signifNet));
				if (argbNet) applyCellStyle(r.getCell(colSignifNetA), { fill: argbNet, border: true });
				const colDecisionA = 35 + nImp;
				r.getCell(colDecisionA).dataValidation = { type: 'list', allowBlank: true, formulae: ['"Accepter,Réduire,Transférer,Éviter"'] };
				// Risque Résiduel: Criticité, Impact rés., Vraisemblance, I*P*C rés., Niveau (39+nImp)
				applyCellStyle(r.getCell(37 + nImp), { fill: FILL_JAUNE_200, border: true });
				applyCellStyle(r.getCell(38 + nImp), { fill: FILL_JAUNE_200, border: true });
				applyCellStyle(r.getCell(39 + nImp), { fill: 'FFFB923C', border: true });
				const colNiveauResiduelA = 41 + nImp;
				const argbRes = tailwindToExcelArgb(getNiveauRisqueBg(signifResiduel));
				if (argbRes) applyCellStyle(r.getCell(colNiveauResiduelA), { fill: argbRes, border: true });
			} else if (!cartoViewPartial) {
				if (row.actifMateriel) applyCellStyle(r.getCell(11), { fill: FILL_OUI, border: true });
				if (row.actifApplication) applyCellStyle(r.getCell(12), { fill: FILL_OUI, border: true });
				if (row.actifEquipementsSecurite) applyCellStyle(r.getCell(13), { fill: FILL_OUI, border: true });
				if (row.actifEquipementsReseaux) applyCellStyle(r.getCell(14), { fill: FILL_OUI, border: true });
				if (row.actifRessourcesHumaines) applyCellStyle(r.getCell(15), { fill: FILL_OUI, border: true });
				if (row.actifDocument) applyCellStyle(r.getCell(16), { fill: FILL_OUI, border: true });
				if (row.actifDonnees) applyCellStyle(r.getCell(17), { fill: FILL_OUI, border: true });
				if (row.dicD) applyCellStyle(r.getCell(18), { fill: FILL_OUI, border: true });
				if (row.dicI) applyCellStyle(r.getCell(19), { fill: FILL_OUI, border: true });
				if (row.dicC) applyCellStyle(r.getCell(20), { fill: FILL_OUI, border: true });
				applyCellStyle(r.getCell(24), { fill: FILL_JAUNE_200, border: true });
				applyCellStyle(r.getCell(25 + nImp), { fill: FILL_JAUNE_200, border: true });
				applyCellStyle(r.getCell(26 + nImp), { fill: FILL_JAUNE_200, border: true });
				applyCellStyle(r.getCell(27 + nImp), { fill: 'FFFB923C', border: true });
				const colSignifBrut = 28 + nImp;
				const colSignifNet = 33 + nImp;
				const colSignifResiduel = 39 + nImp;
				[colSignifBrut, colSignifNet, colSignifResiduel].forEach((colIdx, idx) => {
					const niveau = [signifBrut, signifNet, signifResiduel][idx];
					const argb = tailwindToExcelArgb(getNiveauRisqueBg(niveau));
					if (argb) applyCellStyle(r.getCell(colIdx), { fill: argb, border: true });
				});
				const colDecision = 34 + nImp;
				r.getCell(colDecision).dataValidation = { type: 'list', allowBlank: true, formulae: ['"Accepter,Réduire,Transférer,Éviter"'] };
			}
		});

		for (let c = 1; c <= numCartoColsExport; c++) {
			const origCol = cartoViewPartial ? includedCols[c - 1] : c;
			const col = wsCarto.getColumn(c);
			if (origCol === 5) col.width = 38;
			else if (origCol === 2 || origCol === 3) col.width = 20;
			else if (origCol === 7 || origCol === 8 || origCol === 9) col.width = 18;
			else if (isCartoVersionA && (origCol === 10 || origCol === 29 + nImp)) col.width = 18;
			else if (isCartoVersionA && origCol === 36 + nImp) col.width = 24;  // Action PTR
			else if (!isCartoVersionA && (origCol === 10 || origCol === 29 + nImp)) col.width = 18;
			else if (!isCartoVersionA && origCol === 35 + nImp) col.width = 24;  // Action PTR
			else col.width = 14;
		}
		wsCarto.views = [{ state: 'frozen', ySplit: cartoViewPartial ? 2 : (numCartoCols >= 23 ? 4 : 3), activeCell: cartoViewPartial ? 'A3' : (numCartoCols >= 23 ? 'A5' : 'A4'), showGridLines: true }];
		}

		// --- Feuille 5 : Aide-Risque (probabilité, impact, fréquence, efficacité avec couleurs) ---
		if (selectedSheets.has('aide-risque')) {
		const impactLabelsAideRisque = impactDefinitionsRows.map((d) => d.libelle);
		const wsAideRisque = wb.addWorksheet('Aide-Risque', { views: [{ showGridLines: true }] });
		wsAideRisque.addRow(['Aide-Risque']).font = { bold: true, size: 14 };
		wsAideRisque.addRow([]);
		wsAideRisque.addRow(['Probabilité']).font = { bold: true };
		const rowProbaHeader = wsAideRisque.addRow(['Échelle', 'Définition', 'Fréquence', 'Historique']);
		applyHeaderRow(wsAideRisque, rowProbaHeader);
		(probaRows as ProbaRow[]).forEach((r) => {
			const row = wsAideRisque.addRow([r.echelle, r.definition, r.frequence, r.historique]);
			applyDataRowBorder(wsAideRisque, row);
			const fillColor = r.bgColor ?? getProbaDefBg(r.definition);
			const argb = tailwindToExcelArgb(fillColor);
			if (argb) row.eachCell((c) => applyCellStyle(c, { fill: argb, border: true }));
		});
		wsAideRisque.addRow([]);
		wsAideRisque.addRow(['Impact']).font = { bold: true };
		const rowImpactHeader = wsAideRisque.addRow(['Échelle', 'Définition', ...impactLabelsAideRisque]);
		applyHeaderRow(wsAideRisque, rowImpactHeader);
		(impactRows as ImpactRow[]).forEach((r) => {
			const criteres = getImpactRowCriteres(r);
			const row = wsAideRisque.addRow([r.echelle, r.definition, ...criteres]);
			applyDataRowBorder(wsAideRisque, row);
			const fillColor = r.bgColor ?? getImpactDefBg(r.definition);
			const argb = tailwindToExcelArgb(fillColor);
			if (argb) row.eachCell((c) => applyCellStyle(c, { fill: argb, border: true }));
		});
		wsAideRisque.addRow([]);
		wsAideRisque.addRow(['Fréquence risque']).font = { bold: true };
		const rowFreqHeader = wsAideRisque.addRow(['Échelle', 'Définition', 'Signification']);
		applyHeaderRow(wsAideRisque, rowFreqHeader);
		frequenceRisqueRows.forEach((r) => {
			const row = wsAideRisque.addRow([r.echelle, r.definition, (r as Row & { signification?: string }).signification ?? '']);
			applyDataRowBorder(wsAideRisque, row);
			const argb = tailwindToExcelArgb((r as Row & { bgColor?: string }).bgColor);
			if (argb) row.eachCell((c) => applyCellStyle(c, { fill: argb, border: true }));
		});
		wsAideRisque.addRow([]);
		wsAideRisque.addRow(['Définitions des impacts (Cartographie)']).font = { bold: true };
		const rowImpDefHeader = wsAideRisque.addRow(['Libellé', 'Définition']);
		applyHeaderRow(wsAideRisque, rowImpDefHeader);
		impactDefinitionsRows.forEach((r) => {
			const row = wsAideRisque.addRow([r.libelle, r.definition]);
			applyDataRowBorder(wsAideRisque, row);
		});
		wsAideRisque.addRow([]);
		wsAideRisque.addRow(['Efficacité (DMR/PTR)']).font = { bold: true };
		const rowEffHeader = wsAideRisque.addRow(['Niveau', 'Signification', 'Descriptif', 'Intervalle', 'Valeur']);
		applyHeaderRow(wsAideRisque, rowEffHeader);
		efficaciteRows.forEach((r) => {
			const row = wsAideRisque.addRow([r.niveau, r.signification, r.descriptif, r.intervalle, r.valeur]);
			applyDataRowBorder(wsAideRisque, row);
			const argb = tailwindToExcelArgb(r.bgColor);
			if (argb) row.eachCell((c) => applyCellStyle(c, { fill: argb, border: true }));
		});
		wsAideRisque.addRow([]);
		wsAideRisque.addRow(['Matrice risque']).font = { bold: true };
		const valeurs0 = matriceRisqueRows[0]?.valeurs ?? [];
		const matriceHeaders = ['Libellé', ...valeurs0.map((_, i) => `Col${i + 1}`)];
		const rowMatHeader = wsAideRisque.addRow(matriceHeaders);
		applyHeaderRow(wsAideRisque, rowMatHeader);
		(matriceRisqueRows ?? []).forEach((r) => {
			const valeurs = r.valeurs ?? [];
			const row = wsAideRisque.addRow([r.libelle ?? '', ...valeurs]);
			applyDataRowBorder(wsAideRisque, row);
			// Couleurs des cellules de la matrice (selon intervalles Fréquence risque)
			valeurs.forEach((v, idx) => {
				const tw = getMatriceCellBgFromFrequence(v);
				const argb = tailwindToExcelArgb(tw);
				if (argb) {
					row.getCell(idx + 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
				}
			});
		});
		}

		// --- Feuille Synthèse (vide pour l’instant) ---
		if (selectedSheets.has('synthese')) {
		const wsSynthese = wb.addWorksheet('Synthese', { views: [{ showGridLines: true }] });
		wsSynthese.addRow(['Synthèse - Cartographie des risques']).font = { bold: true, size: 14 };
		}

		// --- Feuille 6 : PTR (libellés et couleur d'en-tête comme à l'écran : #FFC000) ---
		if (selectedSheets.has('ptr')) {
		const ptrHeaders = [
			'REF Risque', 'Corresp. ISO27001, annexe A', 'Propriétaire du risque', 'Niveau du risque net', 'Décision', 'ID PTR', 'Action à mettre en place',
			'Type de l\'action', 'Porteur de l\'action', 'Priorité', 'Durée de mise en oeuvre', 'Complexité', 'Echéance', 'Etat d\'avancement'
		];
		const wsPTR = wb.addWorksheet('PTR', { views: [{ showGridLines: true }] });
		wsPTR.addRow(['PTR - Plan de traitement des risques']).font = { bold: true, size: 14 };
		wsPTR.addRow([]);
		const rowPtrHeader = wsPTR.addRow(ptrHeaders);
		rowPtrHeader.eachCell((cell) => {
			cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } };
			cell.font = { bold: true, color: { argb: 'FF000000' } };
			cell.border = EXCEL_BORDER_THIN;
			cell.alignment = { vertical: 'middle', wrapText: true };
		});
		ptrData.forEach((r, i) => {
			const idPTR = 'PTR-' + String(i + 1).padStart(3, '0');
			const row = wsPTR.addRow([
				r.refRisque, r.correspISO, r.proprietaire, r.niveauRisque, r.decision, idPTR, r.action,
				r.typeAction, r.porteur, r.priorite, r.periodicite, r.complexite, r.echeance, r.etatAvancement
			]);
			applyDataRowBorder(wsPTR, row);
			// Couleur type action (col 8)
			const typeActionRow = typeActionRows.find((t) => t.type_action === r.typeAction);
			const argbType = typeActionRow ? tailwindToExcelArgb(typeActionRow.bgColor) : null;
			if (argbType) {
				const cell = row.getCell(8);
				applyCellStyle(cell, { fill: argbType, border: true });
			}
			// Couleur priorité (col 10)
			const prioriteRow = prioriteRows.find((p) => p.echelle === r.priorite);
			const argbPriorite = prioriteRow ? tailwindToExcelArgb(prioriteRow.bgColor) : null;
			if (argbPriorite) {
				const cell = row.getCell(10);
				applyCellStyle(cell, { fill: argbPriorite, border: true });
			}
			// Couleur Durée de mise en oeuvre (col 11)
			const perRow = periodiciteRows.find((p) => p.periodicite === r.periodicite);
			const argbPer = perRow ? tailwindToExcelArgb(perRow.bgColor) : null;
			if (argbPer) {
				const cell = row.getCell(11);
				applyCellStyle(cell, { fill: argbPer, border: true });
			}
			// Couleur complexité (col 12)
			const compRow = complexiteRows.find((c) => c.complexite === r.complexite);
			const argbComp = compRow ? tailwindToExcelArgb(compRow.bgColor) : null;
			if (argbComp) {
				const cell = row.getCell(12);
				applyCellStyle(cell, { fill: argbComp, border: true });
			}
		});
		}

		// --- Feuille 7 : Echelle-PTR ( titres et colonnes comme à l'écran, en-têtes jaune) ---
		if (selectedSheets.has('echelle-ptr')) {
		const wsEchelle = wb.addWorksheet('Echelle-PTR', { views: [{ showGridLines: true }] });
		wsEchelle.addRow(['Échelle-PTR ']).font = { bold: true, size: 14 };
		wsEchelle.addRow([]);
		const YELLOW_500_HEADER = 'FFEAB308'; // bg-yellow-500, texte blanc comme à l'écran
		wsEchelle.addRow(['Table 1 : Durée de mise en oeuvre ']).font = { bold: true };
		const rowPerHeader = wsEchelle.addRow(['Durée de mise en oeuvre', 'Description']);
		rowPerHeader.eachCell((cell) => {
			cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: YELLOW_500_HEADER } };
			cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
			cell.border = EXCEL_BORDER_THIN;
			cell.alignment = { vertical: 'middle', wrapText: true };
		});
		periodiciteRows.forEach((r) => {
			const row = wsEchelle.addRow([r.periodicite, (r as Row & { duree?: string }).duree ?? '']);
			applyDataRowBorder(wsEchelle, row);
			const argb = tailwindToExcelArgb(r.bgColor);
			if (argb) applyCellStyle(row.getCell(1), { fill: argb, border: true });
		});
		wsEchelle.addRow([]);
		wsEchelle.addRow(['Table 2 : Niveau de complexité']).font = { bold: true };
		const rowCompHeader = wsEchelle.addRow(['Complexité', 'Définition du niveau de complexité supposé']);
		rowCompHeader.eachCell((cell) => {
			cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: YELLOW_500_HEADER } };
			cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
			cell.border = EXCEL_BORDER_THIN;
			cell.alignment = { vertical: 'middle', wrapText: true };
		});
		complexiteRows.forEach((r) => {
			const row = wsEchelle.addRow([r.complexite, (r as Row & { definition?: string }).definition ?? '']);
			applyDataRowBorder(wsEchelle, row);
			const argb = tailwindToExcelArgb(r.bgColor);
			if (argb) applyCellStyle(row.getCell(1), { fill: argb, border: true });
		});
		wsEchelle.addRow([]);
		wsEchelle.addRow(['Table 3 : Type de l\'action']).font = { bold: true };
		const rowTypeHeader = wsEchelle.addRow(['Type de l\'action', 'Description']);
		rowTypeHeader.eachCell((cell) => {
			cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: YELLOW_500_HEADER } };
			cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
			cell.border = EXCEL_BORDER_THIN;
			cell.alignment = { vertical: 'middle', wrapText: true };
		});
		typeActionRows.forEach((r) => {
			const row = wsEchelle.addRow([r.type_action, (r as Row & { description?: string }).description ?? '']);
			applyDataRowBorder(wsEchelle, row);
			const argb = tailwindToExcelArgb(r.bgColor);
			if (argb) applyCellStyle(row.getCell(1), { fill: argb, border: true });
		});
		wsEchelle.addRow([]);
		wsEchelle.addRow(['Table 4 : Priorité']).font = { bold: true };
		const rowPriorHeader = wsEchelle.addRow(['Échelle', 'Définition', 'Signification']);
		rowPriorHeader.eachCell((cell) => {
			cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: YELLOW_500_HEADER } };
			cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
			cell.border = EXCEL_BORDER_THIN;
			cell.alignment = { vertical: 'middle', wrapText: true };
		});
		prioriteRows.forEach((r) => {
			const row = wsEchelle.addRow([r.echelle, r.definition ?? '', (r as Row & { signification?: string }).signification ?? '']);
			applyDataRowBorder(wsEchelle, row);
			const argb = tailwindToExcelArgb(r.bgColor);
			if (argb) applyCellStyle(row.getCell(1), { fill: argb, border: true });
		});
		}

		// Activer wrap text sur toutes les feuilles
		wb.eachSheet((ws) => applyWrapTextToSheet(ws));

		// Tailles par défaut des cellules (colonnes sans largeur explicite, toutes les lignes)
		const EXCEL_DEFAULT_COL_WIDTH = 18;   // largeur en unités de caractères
		const EXCEL_DEFAULT_ROW_HEIGHT = 22;  // hauteur en points
		wb.eachSheet((ws) => {
			ws.properties.defaultColWidth = EXCEL_DEFAULT_COL_WIDTH;
			ws.properties.defaultRowHeight = EXCEL_DEFAULT_ROW_HEIGHT;
		});

		const fileName = `La-methode-NearSecure-${new Date().toISOString().slice(0, 10)}.xlsx`;
		let buffer: ArrayBuffer;
		try {
			buffer = await wb.xlsx.writeBuffer();
		} catch (err) {
			console.error('Export Excel writeBuffer:', err);
			alert('Erreur lors de la génération du fichier Excel. Consultez la console pour plus de détails.');
			return;
		}
		const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

		// Méthode 1 : File System Access API (fiable en contexte asynchrone, Chrome/Edge)
		if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
			try {
				const handle = await (window as unknown as { showSaveFilePicker: (opts: { suggestedName: string; types?: { description: string; accept: Record<string, string[]> }[] }) => Promise<FileSystemFileHandle> }).showSaveFilePicker({
					suggestedName: fileName,
					types: [{ description: 'Fichier Excel', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] } }]
				});
				const writable = await handle.createWritable();
				await writable.write(blob);
				await writable.close();
				return;
			} catch (pickerErr: unknown) {
				// L'utilisateur a annulé la boîte de dialogue ou l'API a échoué → fallback sur le lien
				if (pickerErr instanceof Error && pickerErr.name === 'AbortError') return;
				console.warn('showSaveFilePicker non disponible ou annulé, fallback lien:', pickerErr);
			}
		}

		// Méthode 2 : lien <a> avec téléchargement (fallback)
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.setAttribute('href', url);
		a.setAttribute('download', fileName);
		a.style.display = 'none';
		a.style.visibility = 'hidden';
		document.body.appendChild(a);
		try {
			a.click();
		} finally {
			document.body.removeChild(a);
			setTimeout(() => URL.revokeObjectURL(url), 1000);
		}
	}

	onMount(() => {
		loadCustomMethodState();
		const saveOnUnload = () => saveCustomMethodState();
		window.addEventListener('beforeunload', saveOnUnload);
		// Sauvegarde dès que l’utilisateur quitte l’onglet ou ferme la fenêtre (plus fiable que beforeunload seul)
		const saveOnVisibilityHidden = () => {
			if (typeof document !== 'undefined' && document.visibilityState === 'hidden') saveCustomMethodState();
		};
		document.addEventListener('visibilitychange', saveOnVisibilityHidden);
		// Cartographie: bind:value mutates in place so reactivity never fires. Save directly every 2s when on that section.
		const cartoPersistInterval = setInterval(() => {
			if (activeSection === 'cartographie-risques') saveCustomMethodState();
		}, 2000);
		// Sauvegarde périodique toutes les 20s pour limiter la perte de données en cas de fermeture brutale
		const globalPersistInterval = setInterval(() => saveCustomMethodState(), 20_000);
		return () => {
			window.removeEventListener('beforeunload', saveOnUnload);
			document.removeEventListener('visibilitychange', saveOnVisibilityHidden);
			clearInterval(cartoPersistInterval);
			clearInterval(globalPersistInterval);
			if (saveFeedbackTimeout) clearTimeout(saveFeedbackTimeout);
		};
	});

	beforeNavigate(({ from }) => {
		if (from?.url?.pathname?.includes('Methode-risque-nearsecure')) {
			saveCustomMethodState();
		}
	});

	/** Redimensionne un textarea pour qu'il affiche tout son contenu (cellules flexibles en hauteur). */
	function resizeTextarea(ta: HTMLTextAreaElement) {
		ta.style.height = 'auto';
		const minH = 52; // ~2.5rem
		ta.style.height = Math.max(minH, ta.scrollHeight) + 'px';
	}
	/** Redimensionne tous les textareas de la page Custom method. */
	function resizeAllTextareasInPage() {
		const main = document.querySelector('.methode-risque-nearsecure-page');
		if (main) main.querySelectorAll('textarea').forEach((el) => resizeTextarea(el as HTMLTextAreaElement));
	}
	/** Action : écoute input/change sur les textareas du conteneur et redimensionne. */
	function autoResizeTextareas(node: HTMLElement) {
		const handler = (e: Event) => {
			if (e.target instanceof HTMLTextAreaElement) resizeTextarea(e.target);
		};
		node.addEventListener('input', handler);
		node.addEventListener('change', handler);
		resizeAllTextareasInPage();
		return {
			destroy() {
				node.removeEventListener('input', handler);
				node.removeEventListener('change', handler);
			}
		};
	}
	// Ne redimensionner tous les textareas qu'au changement de section pour éviter de réinitialiser le scroll à chaque update
	$: if (typeof window !== 'undefined' && activeSection) {
		requestAnimationFrame(() => resizeAllTextareasInPage());
	}

	/** Édition au clic : quelle cellule est en cours d'édition (tous tableaux) */
	let editingCell: { table: string; row: number; field: string } | null = null;
	function focusTextareaOnMount(node: HTMLTextAreaElement, shouldFocus = true) {
		if (shouldFocus) node.focus();
	}
	function focusInputOnMount(node: HTMLInputElement) {
		node.focus();
	}
	function isEditing(table: string, row: number, field: string): boolean {
		return editingCell?.table === table && editingCell?.row === row && editingCell?.field === field;
	}
	function startEditing(table: string, row: number, field: string) {
		editingCell = { table, row, field };
	}
	function stopEditing() {
		editingCell = null;
		saveCustomMethodState();
	}

	const ECHELLE_PTR_COULEURS = [
		'bg-orange-100',
		'bg-green-100',
		'bg-yellow-100',
		'bg-gray-100',
		'bg-sky-100',
		'bg-amber-100',
		'bg-white',
		'bg-red-500',
		'bg-yellow-400',
		'bg-green-400',
		'bg-yellow-300',
		'bg-orange-400',
		'bg-red-500 text-black',
		'bg-yellow-400 text-black',
		'bg-green-400 text-black',
		'bg-yellow-300 text-black',
		'bg-orange-400 text-black'
	];

	let periodiciteRows: Row[] = [
		{ periodicite: 'QuickWin', duree: '0 – 3 mois', bgColor: 'bg-orange-100' },
		{ periodicite: 'Court terme', duree: '3 – 12 mois', bgColor: 'bg-green-100' },
		{ periodicite: 'Moyen terme', duree: '12 – 18 mois', bgColor: 'bg-yellow-100' },
		{ periodicite: 'Long terme', duree: 'Supérieur à 18 mois', bgColor: 'bg-gray-100' },
		{ periodicite: 'Périodique', duree: 'Périodiquement', bgColor: 'bg-sky-100' }
	];

	let complexiteRows: Row[] = [
		{
			complexite: 'Important',
			definition:
				"Complexité à coût important, correspondant à une tâche supérieure à une dizaine de jours/homme et/ou un coût supérieur à une centaine de milliers de dirhams (par exemple, refonte d'une architecture réseau).",
			bgColor: 'bg-red-500 text-black'
		},
		{
			complexite: 'Moyen',
			definition:
				"Complexité à coût moyen, correspondant à une tâche inférieure à une dizaine de jours/homme et/ou un coût inférieur à une centaine de milliers de dirhams (par exemple, rédaction d'une procédure plus complexe, achat d'un composant, etc.).",
			bgColor: 'bg-yellow-400 text-black'
		},
		{
			complexite: 'Faible',
			definition:
				"Complexité à coût faible, n'entraînant pas de coût d'acquisition (par exemple, modification d'un paramètre, rédaction d'une procédure simple, etc.).",
			bgColor: 'bg-green-400 text-black'
		}
	];

	let typeActionRows: Row[] = [
		{
			type_action: 'Action Organisationnelle',
			description: 'Action visant à modifier les processus ou politiques internes de la SOCIÉTÉ.',
			bgColor: 'bg-sky-100'
		},
		{
			type_action: 'Action Technique',
			description: 'Intervention sur les SI ou infrastructures techniques de la SOCIÉTÉ.',
			bgColor: 'bg-green-100'
		},
		{
			type_action: 'Action Organisationnelle et Technique',
			description: 'Action combinant les deux dimensions (organisationnelle et technique).',
			bgColor: 'bg-amber-100'
		}
	];

	let prioriteRows: Row[] = [
		{ echelle: 'Priorité 4', definition: 'Risque Faible', signification: '[1 – 20[', bgColor: 'bg-green-400 text-black' },
		{ echelle: 'Priorité 3', definition: 'Risque Modéré', signification: '[20 – 36[', bgColor: 'bg-yellow-300 text-black' },
		{ echelle: 'Priorité 2', definition: 'Risque Élevé', signification: '[36 – 64[', bgColor: 'bg-orange-400 text-black' },
		{ echelle: 'Priorité 1', definition: 'Risque Extrême', signification: '[64 – 120]', bgColor: 'bg-red-500 text-black' }
	];

	let editModeEchellePtr = false;

	/** Les onglets Aide-Risque et Échelle PTR sont toujours en affichage seul ; l'édition se fait uniquement dans Paramétrage */
	$: readOnlyAideRisque = (activeSection === 'aide-risque');
	$: readOnlyEchellePtr = (activeSection === 'echelle-ptr');
	/** Dans l'onglet Paramétrage, on affiche les blocs Aide-Risque et Échelle PTR en mode édition */
	$: parametrageEditRisque = (activeSection === 'parametrage');
	$: parametrageEditPtr = (activeSection === 'parametrage');

	// --- Aide-Classification: Tableaux DIC ---

	type DICCriteriaRow = {
		critere: string;
		definition: string;
		bgColor: string;
	};

	let dicCriteriaRows: DICCriteriaRow[] = [
		{
			critere: 'Disponibilité',
			definition:
				"Les utilisateurs autorisés ont accès à l'information et aux actifs correspondants quand ils en ont besoin.",
			bgColor: 'bg-green-600'
		},
		{
			critere: 'Intégrité',
			definition: "Garantir l'exactitude, la précision et l'intégralité de l'information.",
			bgColor: 'bg-green-400'
		},
		{
			critere: 'Confidentialité',
			definition: "L'information n'est accessible qu'aux personnes autorisées.",
			bgColor: 'bg-blue-600'
		}
	];

	type DICNiveauRow = {
		valeur: string;
		disponibilite: string;
		integrite: string;
		confidentialite: string;
		bgColor?: string;
	};

	const DIC_NIVEAU_COULEURS = [
		'bg-green-500',
		'bg-green-600',
		'bg-yellow-400',
		'bg-orange-500',
		'bg-red-500',
		'bg-red-600',
		'bg-rose-900',
		'bg-gray-500'
	];

	let dicNiveauxRows: DICNiveauRow[] = [
		{
			valeur: 'Faible',
			disponibilite:
				"Tolérance à l'indisponibilité <span class='font-bold text-green-700'>entre 48h et une semaine</span>. Si ce besoin n'est pas respecté, l'organisation court un **impact mineur** sur les activités.",
			integrite:
				"<span class='font-bold text-green-700'>La perte d'intégrité momentanée</span> des informations est acceptée, sous réserve qu'elle soit signalée et ne remette pas en cause le service fourni.",
			confidentialite:
				"<span class='font-bold text-green-700'>Public</span> : Information qui peut être rendue publique sans implication pour l'entité ou pour l'organisation.",
			bgColor: 'bg-green-500'
		},
		{
			valeur: 'Moyen',
			disponibilite:
				"Tolérance à l'indisponibilité <span class='font-bold text-orange-700'>entre 24h et 48h</span>. Si ce besoin n'est pas respecté, l'organisation court un **impact modéré**.",
			integrite:
				"<span class='font-bold text-orange-700'>La perte d'intégrité tolérée si signalée</span> dans un délai suffisant pour ne pas avoir de conséquence grave sur le service fourni.",
			confidentialite:
				"<span class='font-bold text-orange-700'>Interne</span> : Information ayant vocation à demeurer au sein de l'organisation. Sa communication à l'extérieur de l'organisation ne peut se faire que sur autorisation.",
			bgColor: 'bg-orange-500'
		},
		{
			valeur: 'Élevé',
			disponibilite:
				"Tolérance à l'indisponibilité <span class='font-bold text-red-700'>entre 4h et 24h</span>. Si ce besoin n'est pas respecté, l'organisation court un **impact significatif**.",
			integrite:
				"Les informations <span class='font-bold text-red-700'>doivent rester intègres pendant la période d'utilisation</span> ; toute perte en dehors de cette période doit être signalée et justifiée.",
			confidentialite:
				"<span class='font-bold text-red-700'>Restreint</span> : Information qui aurait un impact dommageable sur l'organisation si elle était communiquée à des personnes non habilitées. Elle nécessite un accès limité à des personnes ou à un groupe d'utilisateurs bien défini.",
			bgColor: 'bg-red-500'
		},
		{
			valeur: 'Très élevé',
			disponibilite:
				"Tolérance à l'indisponibilité <span class='font-bold text-rose-900'>inférieure à 4 heures</span>. Si ce besoin n'est pas respecté, l'organisation court un **impact exceptionnellement majeur**.",
			integrite:
				"Les informations sont <span class='font-bold text-rose-900'>certifiées intègres</span> pendant toute leur période de validité.",
			confidentialite:
				"<span class='font-bold text-rose-900'>Confidentiel</span> : La divulgation de l'information aurait un impact majeur sur la SOCIETE si elle était communiquée à des personnes nommément désignées pour en connaître. Le circuit de l'information obéit à des règles très strictes.",
			bgColor: 'bg-rose-900'
		}
	];

	let editModeTable12 = false;

	function getValeurBgDefault(valeur: string): string {
		switch (valeur) {
			case 'Faible':
				return 'bg-green-500';
			case 'Moyen':
				return 'bg-orange-500';
			case 'Élevé':
				return 'bg-red-500';
			case 'Très élevé':
				return 'bg-rose-900';
			default:
				return 'bg-orange-500';
		}
	}

	function ajouterNiveauDic() {
		dicNiveauxRows = [
			...dicNiveauxRows,
			{
				valeur: 'Nouveau',
				disponibilite: '',
				integrite: '',
				confidentialite: '',
				bgColor: 'bg-gray-500'
			}
		];
		saveCustomMethodState();
	}

	function supprimerNiveauDic(index: number) {
		if (dicNiveauxRows.length <= 1) return;
		dicNiveauxRows = dicNiveauxRows.filter((_, i) => i !== index);
		saveCustomMethodState();
	}

	function insererNiveauDicAvant(index: number) {
		const def: DICNiveauRow = {
			valeur: 'Nouveau',
			disponibilite: '',
			integrite: '',
			confidentialite: '',
			bgColor: 'bg-gray-500'
		};
		dicNiveauxRows = insererLigneAvant(dicNiveauxRows, index, def);
		saveCustomMethodState();
	}

	function insererNiveauDicApres(index: number) {
		const def: DICNiveauRow = {
			valeur: 'Nouveau',
			disponibilite: '',
			integrite: '',
			confidentialite: '',
			bgColor: 'bg-gray-500'
		};
		dicNiveauxRows = insererLigneApres(dicNiveauxRows, index, def);
		saveCustomMethodState();
	}

	/** Type pour Tableau 2 – Catégories d'actifs (Aide-Classification) : libellé + type primaire/support */
	type CategorieActifRow = { libelle: string; type_actif: string };

	function defaultCategorieActifRow(libelle: string, type_actif?: string): CategorieActifRow {
		const t = (type_actif || '').trim();
		if (t === 'Actif primaire' || t === 'Actif support') return { libelle, type_actif: t };
		// Défaut : Document / Données → Actif primaire, sinon Actif support
		const l = libelle.trim().toLowerCase();
		return { libelle, type_actif: l === 'document' || l === 'données' || l === 'donnée' ? 'Actif primaire' : 'Actif support' };
	}

	let categoriesActifsRows: CategorieActifRow[] = [
		defaultCategorieActifRow('Matériel informatique'),
		defaultCategorieActifRow('Application'),
		defaultCategorieActifRow('Equipements sécurité'),
		defaultCategorieActifRow('Equipements réseaux'),
		defaultCategorieActifRow('Ressources humaines'),
		defaultCategorieActifRow('Document', 'Actif primaire'),
		defaultCategorieActifRow('Données', 'Actif primaire'),
		defaultCategorieActifRow('Site')
	];

	function getPeriodiciteBgDefault(periodicite: string): string {
		switch (periodicite) {
			case 'QuickWin': return 'bg-orange-100 border border-orange-200';
			case 'Court terme': return 'bg-green-100 border border-green-200';
			case 'Moyen terme': return 'bg-yellow-100 border border-yellow-200';
			case 'Long terme': return 'bg-gray-100 border border-gray-300';
			case 'Périodique': return 'bg-sky-100 border border-sky-200';
			default: return 'bg-white border border-gray-300';
		}
	}
	function getPeriodiciteBg(periodicite: string): string {
		const row = periodiciteRows.find((r) => r.periodicite === periodicite);
		return (row && row.bgColor) ? row.bgColor : getPeriodiciteBgDefault(periodicite);
	}

	function getComplexiteBgDefault(complexite: string): string {
		switch (complexite) {
			case 'Important': return 'bg-red-500 border border-red-600 text-black';
			case 'Moyen': return 'bg-yellow-400 border border-yellow-500 text-black';
			case 'Faible': return 'bg-green-400 border border-green-600 text-black';
			default: return 'bg-white border border-gray-300 text-black';
		}
	}
	function getComplexiteBg(complexite: string): string {
		const row = complexiteRows.find((r) => r.complexite === complexite);
		return (row && row.bgColor) ? row.bgColor : getComplexiteBgDefault(complexite);
	}

	function getTypeActionBgDefault(typeAction: string): string {
		switch (typeAction) {
			case 'Action Organisationnelle': return 'bg-sky-100 border border-sky-200';
			case 'Action Technique': return 'bg-green-100 border border-green-200';
			case 'Action Organisationnelle et Technique': return 'bg-amber-100 border border-amber-200';
			default: return 'bg-white border border-gray-300';
		}
	}
	function getTypeActionBg(typeAction: string): string {
		const row = typeActionRows.find((r) => r.type_action === typeAction);
		return (row && row.bgColor) ? row.bgColor : getTypeActionBgDefault(typeAction);
	}

	function getPrioriteDefinitionBgDefault(echelle: string): string {
		switch (echelle) {
			case 'Priorité 4': return 'bg-green-400 border border-green-600 text-black';
			case 'Priorité 3': return 'bg-yellow-300 border border-yellow-500 text-black';
			case 'Priorité 2': return 'bg-orange-400 border border-orange-600 text-black';
			case 'Priorité 1': return 'bg-red-500 border border-red-600 text-black';
			default: return 'bg-white border border-gray-300 text-black';
		}
	}
	function getPrioriteDefinitionBg(echelle: string): string {
		const row = prioriteRows.find((r) => r.echelle === echelle);
		return (row && row.bgColor) ? row.bgColor : getPrioriteDefinitionBgDefault(echelle);
	}

	function getValeurBg(valeur: string): string {
		const row = dicNiveauxRows.find((r) => r.valeur === valeur);
		if (row?.bgColor) return row.bgColor;
		return getValeurBgDefault(valeur);
	}

	// --- Aide-Risque : tableaux probabilité / impact / fréquence / matrice ---

	type ProbaRow = {
		echelle: string;
		definition: string;
		frequence: string;
		historique: string;
		bgColor?: string;
	};

	let probaRows: ProbaRow[] = [
		{
			echelle: '1',
			definition: 'Très faible',
			frequence: 'Pas de chance que le scénario se réalise avec succès.',
			historique: 'Une fois tous les 10 ans.'
		},
		{
			echelle: '2',
			definition: 'Faible',
			frequence: 'Très peu de chance que le scénario se réalise avec succès.',
			historique: 'Une fois tous les 3 ans.'
		},
		{
			echelle: '3',
			definition: 'Moyen',
			frequence: 'Peu de chance que le scénario se réalise avec succès.',
			historique: 'Une à plusieurs fois par an.'
		},
		{
			echelle: '4',
			definition: 'Forte',
			frequence: 'Fortes chances que le scénario se réalise avec succès à moyen terme.',
			historique: 'Une à plusieurs fois par mois.'
		},
		{
			echelle: '5',
			definition: 'Très forte',
			frequence: 'Le scénario se réalise fréquemment avec succès à court terme.',
			historique: 'Une à plusieurs fois par semaine.'
		}
	];

	type ImpactRow = {
		echelle: string;
		definition: string;
		financier: string;
		reputation: string;
		parties_prenantes: string;
		reglementaire: string;
		bgColor?: string;
		/** Valeurs par critère d'impact (un par impactDefinitionsRows) – synchronisé à l'ajout/suppression de critères */
		criteres?: string[];
	};

	let impactRows: ImpactRow[] = [
		{
			echelle: '1',
			definition: 'Très faible',
			financier: 'Inférieur à 2 KDH.',
			reputation: 'Aucun impact.',
			parties_prenantes: 'Aucun impact.',
			reglementaire: 'Aucun impact.'
		},
		{
			echelle: '2',
			definition: 'Faible',
			financier: 'Entre 2 et 20 KDH.',
			reputation: 'Impact visible mais médiatisation limitée.',
			parties_prenantes: 'Impact limité.',
			reglementaire: 'Non‑conformité mineure, sanctions < 20 KDH.'
		},
		{
			echelle: '3',
			definition: 'Moyen',
			financier: 'Entre 20 et 200 KDH.',
			reputation: 'Couverture médiatique modérée.',
			parties_prenantes: 'Impact modéré / réclamations récurrentes.',
			reglementaire: 'Non‑conformité modérée, sanctions 20–200 KDH.'
		},
		{
			echelle: '4',
			definition: 'Fort',
			financier: 'Entre 200 K et 2 MDH.',
			reputation: 'Large couverture médiatique.',
			parties_prenantes: 'Impact significatif / réclamations graves et nombreuses.',
			reglementaire: 'Non‑conformité majeure, sanctions 200 K–2 MDH.'
		},
		{
			echelle: '5',
			definition: 'Très fort',
			financier: 'Entre 2 MDH et 20 MDH.',
			reputation: 'Couverture négative prolongée.',
			parties_prenantes: 'Perte de confiance.',
			reglementaire: 'Non‑conformité catastrophique, sanctions > 2 MDH.'
		},
		{
			echelle: '6',
			definition: 'Critique',
			financier: 'Supérieur à 20 MDH.',
			reputation: "Impact très important et durable sur l'image.",
			parties_prenantes: 'Conséquences potentiellement catastrophiques pour les parties prenantes.',
			reglementaire:
				"Non‑conformité critique, sanctions majeures et risque sur la continuité de l'organisation."
		}
	];

	let frequenceRisqueRows: Row[] = [
		{ echelle: '1', definition: 'Risque Faible', signification: '[1 – 20[' },
		{ echelle: '2', definition: 'Risque Modéré', signification: '[20 – 36[' },
		{ echelle: '3', definition: 'Risque Elevé', signification: '[36 – 64[' },
		{ echelle: '4', definition: 'Risque Extrême', signification: '[64 – 120]' }
	];

	type MatriceRow = { libelle: string; valeurs: number[] };

	let matriceRisqueRows: MatriceRow[] = [
		{ libelle: '4×1', valeurs: [4, 8, 12, 16, 20] },
		{ libelle: '4×2', valeurs: [8, 16, 24, 32, 40] },
		{ libelle: '4×3', valeurs: [12, 24, 36, 48, 60] },
		{ libelle: '4×4', valeurs: [16, 32, 48, 64, 80] },
		{ libelle: '4×5', valeurs: [20, 40, 60, 80, 100] },
		{ libelle: '4×6', valeurs: [24, 48, 72, 96, 120] }
	];

	type EfficaciteRow = {
		niveau: string;
		signification: string;
		descriptif: string;
		intervalle: string;
		valeur: string;
		bgColor?: string;
	};

	let efficaciteRows: EfficaciteRow[] = [
		{
			niveau: '1',
			signification: 'Insuffisant',
			descriptif: '- Dispositif quasi inexistant ou inefficace\n- Contrôles absents ou très rares\n- Applicabilité très limitée\n- Couverture quasi nulle (<30% du périmètre)',
			intervalle: '0 % – 30 %',
			valeur: '0.15'
		},
		{
			niveau: '2',
			signification: 'Faible',
			descriptif: '- Dispositif en début de déploiement, incomplet\n- Contrôles parfois appliqués mais non systématiques\n- Applicabilité partielle\n- Couverture limitée, risque toujours élevé (30-60% du périmètre)',
			intervalle: '31 % – 60 %',
			valeur: '0.45'
		},
		{
			niveau: '3',
			signification: 'Acceptable',
			descriptif: '- Dispositif en place et fonctionnel mais avec des lacunes\n- Contrôles réguliers mais améliorable\n- Applicabilité satisfaisante\n- Couverture correcte mais non exhaustive (60-80% du périmètre)',
			intervalle: '61 % – 80 %',
			valeur: '0.70'
		},
		{
			niveau: '4',
			signification: 'Efficace',
			descriptif: '- Dispositif robuste et bien intégré\n- Contrôles efficaces, réguliers et fiables\n- Forte applicabilité\n- Large couverture du périmètre impacté (80-95% du périmètre)',
			intervalle: '81 % – 95 %',
			valeur: '0.90'
		},
		{
			niveau: '5',
			signification: 'Exemplaire',
			descriptif: '- Dispositif optimal, proactif et innovant\n- Contrôles exhaustifs et très fiables\n- Applicabilité maximale\n- Couverture complète du périmètre (>95% du périmètre)',
			intervalle: '96 % – 100 %',
			valeur: '0.98'
		}
	];

	let editModeAideRisque = false;
	const AIDE_RISQUE_COULEURS = [
		'bg-green-400 text-black',
		'bg-yellow-300 text-black',
		'bg-orange-400 text-black',
		'bg-red-500 text-black',
		'bg-red-700 text-black',
		'bg-red-900 text-white',
		'bg-white text-black',
		'bg-[#ff0000] text-black',
		'bg-[#ffc000] text-black',
		'bg-[#ffff00] text-black',
		'bg-[#92d050] text-black',
		'bg-[#00b050] text-white'
	];

	/** État partagé : tableaux et échelles (référence commune à tous les projets) */
	function getReferenceState() {
		return {
			periodiciteRows,
			complexiteRows,
			typeActionRows,
			prioriteRows,
			dicCriteriaRows,
			dicNiveauxRows,
			categoriesActifsRows,
			probaRows,
			impactRows,
			impactDefinitionsRows,
			frequenceRisqueRows,
			matriceRisqueRows,
			efficaciteRows
		};
	}

	/** Données métier du projet actuel (à sauvegarder dans projects[id]) */
	function getCurrentProjectData(): ProjectData {
		return {
			name: projects[activeProjectId]?.name ?? 'Projet par défaut',
			redactionRows,
			diffusionRows,
			versionRows,
			registreRows,
			showRegistreLoi0520,
			cartoRows,
			ptrData,
			activeSection,
			cartoView,
			cartoVersion,
			// Échelle PTR
			periodiciteRows,
			complexiteRows,
			typeActionRows,
			prioriteRows,
			// Aides / échelles de risque
			dicCriteriaRows,
			dicNiveauxRows,
			categoriesActifsRows,
			probaRows,
			impactRows,
			impactDefinitionsRows,
			frequenceRisqueRows,
			matriceRisqueRows,
			efficaciteRows
		};
	}

	/** Full state for server/localStorage: format multi-projets (version 2) ou legacy (version 1) */
	function getFullState() {
		// Toujours sauvegarder le projet actuel dans la map avant de sérialiser
		const projectsToSave = { ...projects };
		projectsToSave[activeProjectId] = getCurrentProjectData();
		return {
			version: MULTIPROJECT_STATE_VERSION,
			reference: getReferenceState(),
			projects: projectsToSave,
			activeProjectId
		};
	}

	function applyReferenceState(state: Record<string, unknown>) {
		if (!state || typeof state !== 'object') return;
		if (state.impactDefinitionsRows && Array.isArray(state.impactDefinitionsRows) && (state.impactDefinitionsRows as ImpactDefinition[]).length > 0) {
			impactDefinitionsRows = state.impactDefinitionsRows as ImpactDefinition[];
		}
		if (state.periodiciteRows && Array.isArray(state.periodiciteRows) && state.periodiciteRows.length > 0) {
			const rows = state.periodiciteRows as Row[];
			periodiciteRows = rows.map((r) => ({ ...r, bgColor: r.bgColor || getPeriodiciteBgDefault(r.periodicite) }));
		}
		if (state.complexiteRows && Array.isArray(state.complexiteRows) && state.complexiteRows.length > 0) {
			const rows = state.complexiteRows as Row[];
			complexiteRows = rows.map((r) => ({ ...r, bgColor: r.bgColor || getComplexiteBgDefault(r.complexite) }));
		}
		if (state.typeActionRows && Array.isArray(state.typeActionRows) && state.typeActionRows.length > 0) {
			const rows = state.typeActionRows as Row[];
			typeActionRows = rows.map((r) => ({ ...r, bgColor: r.bgColor || getTypeActionBgDefault(r.type_action) }));
		}
		if (state.prioriteRows && Array.isArray(state.prioriteRows) && state.prioriteRows.length > 0) {
			const rows = state.prioriteRows as Row[];
			prioriteRows = rows.map((r) => ({ ...r, bgColor: r.bgColor || getPrioriteDefinitionBgDefault(r.echelle) }));
		}
		if (state.dicCriteriaRows && Array.isArray(state.dicCriteriaRows) && state.dicCriteriaRows.length > 0) {
			dicCriteriaRows = state.dicCriteriaRows as DICCriteriaRow[];
		}
		if (state.dicNiveauxRows && Array.isArray(state.dicNiveauxRows) && state.dicNiveauxRows.length > 0) {
			const rows = state.dicNiveauxRows as DICNiveauRow[];
			dicNiveauxRows = rows.map((r) => ({ ...r, bgColor: r.bgColor || getValeurBgDefault(r.valeur) }));
		}
		if (state.categoriesActifsRows && Array.isArray(state.categoriesActifsRows)) {
			const raw = state.categoriesActifsRows as (string | CategorieActifRow)[];
			categoriesActifsRows = raw.map((c) => {
				if (typeof c === 'object' && c !== null && 'libelle' in c) {
					const row = c as CategorieActifRow;
					const lib = row.libelle ?? '';
					const t = (row.type_actif || '').trim();
					const typeOk = t === 'Actif primaire' || t === 'Actif support' ? t : defaultCategorieActifRow(lib).type_actif;
					return { libelle: lib, type_actif: typeOk };
				}
				return defaultCategorieActifRow(typeof c === 'string' ? c : '');
			});
		}
		if (state.probaRows && Array.isArray(state.probaRows) && state.probaRows.length > 0) {
			const rows = state.probaRows as ProbaRow[];
			probaRows = rows.map((r) => ({ ...r, bgColor: r.bgColor ?? getProbaDefBg(r.definition) }));
		}
		if (state.impactRows && Array.isArray(state.impactRows) && state.impactRows.length > 0) {
			const rows = state.impactRows as ImpactRow[];
			impactRows = rows.map((r) => ({ ...r, bgColor: r.bgColor ?? getImpactDefBg(r.definition) }));
			syncImpactRowsCriteres();
		}
		if (state.frequenceRisqueRows && Array.isArray(state.frequenceRisqueRows) && state.frequenceRisqueRows.length > 0) {
			const rows = state.frequenceRisqueRows as (Row & { bgColor?: string })[];
			frequenceRisqueRows = rows.map((r) => ({ ...r, bgColor: r.bgColor ?? getFrequenceDefBg(r.definition ?? '') }));
		}
		if (state.matriceRisqueRows && Array.isArray(state.matriceRisqueRows) && state.matriceRisqueRows.length > 0) {
			const rows = state.matriceRisqueRows as MatriceRow[];
			if (rows.every((r) => r && typeof r.libelle === 'string' && Array.isArray(r.valeurs))) {
				matriceRisqueRows = rows.map((r) => ({ libelle: r.libelle, valeurs: [...r.valeurs] }));
			}
		}
		if (state.efficaciteRows && Array.isArray(state.efficaciteRows) && state.efficaciteRows.length > 0) {
			const rows = state.efficaciteRows as EfficaciteRow[];
			efficaciteRows = rows.map((r) => ({ ...r, bgColor: r.bgColor ?? getEfficaciteDefBg(r.signification) }));
		}
	}

	function applyProjectData(data: ProjectData) {
		const sectionIds: SectionId[] = ['controle-document', 'registre-classification', 'aide-classification', 'cartographie-risques', 'aide-risque', 'synthese', 'ptr', 'echelle-ptr', 'parametrage'];
		const cartoViews = ['all', 'identification', 'brut', 'net', 'ptr'] as const;
		if (data.cartoRows && Array.isArray(data.cartoRows)) {
			const arr = (data.cartoRows as CartoRow[]).map((r, i) => {
				const merged = { ...defaultCartoRow(), ...r } as CartoRow;
				const def = cartoRowDefaults[i];
				if (def) {
					for (const k of Object.keys(def) as (keyof CartoRow)[]) {
						const val = def[k];
						if (val === undefined) continue;
						const current = merged[k];
						if (current === undefined || current === '') merged[k] = val as CartoRow[keyof CartoRow];
					}
				}
				merged.impacts = getRowImpacts(merged);
				return merged;
			});
			cartoRows = arr.length > 0 ? arr : [defaultCartoRow()];
		}
		if (data.redactionRows && Array.isArray(data.redactionRows) && data.redactionRows.length > 0) {
			redactionRows = data.redactionRows as RedactionRow[];
		}
		if (data.diffusionRows && Array.isArray(data.diffusionRows) && data.diffusionRows.length > 0) {
			diffusionRows = data.diffusionRows as DiffusionRow[];
		}
		if (data.versionRows && Array.isArray(data.versionRows) && data.versionRows.length > 0) {
			versionRows = data.versionRows as VersionRow[];
		}
		if (data.registreRows && Array.isArray(data.registreRows) && data.registreRows.length > 0) {
			const raw = data.registreRows as Record<string, unknown>[];
			registreRows = raw.map((r) => ({ ...defaultRegistreRow(), ...r })) as RegistreRow[];
		}
		if (typeof data.showRegistreLoi0520 === 'boolean') {
			showRegistreLoi0520 = data.showRegistreLoi0520;
		}
		if (data.activeSection && sectionIds.includes(data.activeSection as SectionId)) {
			activeSection = data.activeSection as SectionId;
		}
		if (data.cartoView && cartoViews.includes(data.cartoView as typeof cartoView)) {
			cartoView = data.cartoView as typeof cartoView;
		}
		if (data.cartoVersion === 'A' || data.cartoVersion === 'B') {
			cartoVersion = data.cartoVersion;
		}
		if (data.ptrData && Array.isArray(data.ptrData) && data.ptrData.length > 0) {
			const rows = data.ptrData as Array<Record<string, unknown>>;
			ptrData = rows.map((r, i) => ({
				id: typeof r.id === 'number' ? r.id : i + 1,
				refRisque: String(r.refRisque ?? ''),
				correspISO: String(r.correspISO ?? ''),
				proprietaire: String(r.proprietaire ?? ''),
				niveauRisque: String(r.niveauRisque ?? ''),
				decision: String(r.decision ?? ''),
				idPTR: String(r.idPTR ?? ''),
				action: String(r.action ?? ''),
				typeAction: String(r.typeAction ?? ''),
				porteur: String(r.porteur ?? ''),
				priorite: String(r.priorite ?? ''),
				periodicite: String(r.periodicite ?? ''),
				complexite: String(r.complexite ?? ''),
				echeance: String(r.echeance ?? ''),
				etatAvancement: String(r.etatAvancement ?? '')
			}));
		} else {
			syncPtrFromCartographie();
		}
		// Échelle PTR propre au projet
		if (data.periodiciteRows && Array.isArray(data.periodiciteRows) && data.periodiciteRows.length > 0) {
			const rows = data.periodiciteRows as Row[];
			periodiciteRows = rows.map((r) => ({ ...r, bgColor: r.bgColor || getPeriodiciteBgDefault(r.periodicite) }));
		}
		if (data.complexiteRows && Array.isArray(data.complexiteRows) && data.complexiteRows.length > 0) {
			const rows = data.complexiteRows as (Row & { bgColor?: string })[];
			complexiteRows = rows.map((r) => ({ ...r, bgColor: r.bgColor || getComplexiteBgDefault(r.complexite) }));
		}
		if (data.typeActionRows && Array.isArray(data.typeActionRows) && data.typeActionRows.length > 0) {
			const rows = data.typeActionRows as (Row & { bgColor?: string })[];
			typeActionRows = rows.map((r) => ({ ...r, bgColor: r.bgColor || getTypeActionBgDefault(r.type_action) }));
		}
		if (data.prioriteRows && Array.isArray(data.prioriteRows) && data.prioriteRows.length > 0) {
			const rows = data.prioriteRows as (Row & { bgColor?: string })[];
			prioriteRows = rows.map((r) => ({ ...r, bgColor: r.bgColor || getPrioriteDefinitionBgDefault(r.echelle) }));
		}
		// Aides classification / risque propres au projet
		if (data.dicCriteriaRows && Array.isArray(data.dicCriteriaRows) && data.dicCriteriaRows.length > 0) {
			dicCriteriaRows = data.dicCriteriaRows as DICCriteriaRow[];
		}
		if (data.dicNiveauxRows && Array.isArray(data.dicNiveauxRows) && data.dicNiveauxRows.length > 0) {
			const rows = data.dicNiveauxRows as DICNiveauRow[];
			dicNiveauxRows = rows.map((r) => ({ ...r, bgColor: r.bgColor || getValeurBgDefault(r.valeur) }));
		}
		if (data.categoriesActifsRows && Array.isArray(data.categoriesActifsRows) && data.categoriesActifsRows.length > 0) {
			const rawCats = data.categoriesActifsRows as CategorieActifRow[];
			categoriesActifsRows = rawCats.map((row) => {
				const lib = row.libelle ?? '';
				const t = (row.type_actif || '').trim();
				const typeOk = t === 'Actif primaire' || t === 'Actif support' ? t : defaultCategorieActifRow(lib).type_actif;
				return { libelle: lib, type_actif: typeOk };
			});
		}
		if (data.probaRows && Array.isArray(data.probaRows) && data.probaRows.length > 0) {
			const rows = data.probaRows as ProbaRow[];
			probaRows = rows.map((r) => ({ ...r, bgColor: r.bgColor ?? getProbaDefBg(r.definition) }));
		}
		if (data.impactRows && Array.isArray(data.impactRows) && data.impactRows.length > 0) {
			const rows = data.impactRows as ImpactRow[];
			impactRows = rows.map((r) => ({ ...r, bgColor: r.bgColor ?? getImpactDefBg(r.definition) }));
			syncImpactRowsCriteres();
		}
		if (data.impactDefinitionsRows && Array.isArray(data.impactDefinitionsRows) && data.impactDefinitionsRows.length > 0) {
			impactDefinitionsRows = data.impactDefinitionsRows as ImpactDefinition[];
			syncImpactRowsCriteres();
		}
		if (data.frequenceRisqueRows && Array.isArray(data.frequenceRisqueRows) && data.frequenceRisqueRows.length > 0) {
			const rows = data.frequenceRisqueRows as (Row & { bgColor?: string })[];
			frequenceRisqueRows = rows.map((r) => ({ ...r, bgColor: r.bgColor ?? getFrequenceDefBg(r.definition ?? '') }));
		}
		if (data.matriceRisqueRows && Array.isArray(data.matriceRisqueRows) && data.matriceRisqueRows.length > 0) {
			const rows = data.matriceRisqueRows as MatriceRow[];
			if (rows.every((r) => r && typeof r.libelle === 'string' && Array.isArray(r.valeurs))) {
				matriceRisqueRows = rows.map((r) => ({ libelle: r.libelle, valeurs: [...r.valeurs] }));
			}
		}
		if (data.efficaciteRows && Array.isArray(data.efficaciteRows) && data.efficaciteRows.length > 0) {
			const rows = data.efficaciteRows as EfficaciteRow[];
			efficaciteRows = rows.map((r) => ({ ...r, bgColor: r.bgColor ?? getEfficaciteDefBg(r.signification) }));
		}
	}

	function applyFullState(state: Record<string, unknown>) {
		if (!state || typeof state !== 'object') return;
		// Format multi-projets (version 2)
		if (state.version === MULTIPROJECT_STATE_VERSION && state.reference && state.projects && typeof state.projects === 'object' && state.activeProjectId) {
			// 1) Charger la référence (ancienne logique : tableaux/échelles partagés)
			applyReferenceState(state.reference as Record<string, unknown>);

			// 2) Migration : si les projets ne contiennent pas encore leurs propres aides/échelles,
			//    on leur crée une copie indépendante à partir de la référence actuelle.
			const loadedProjects = state.projects as Record<string, ProjectData>;
			const hasPerProjectScales = Object.values(loadedProjects).some((p) => {
				return (
					(Array.isArray(p.periodiciteRows) && p.periodiciteRows.length > 0) ||
					(Array.isArray(p.complexiteRows) && p.complexiteRows.length > 0) ||
					(Array.isArray(p.typeActionRows) && p.typeActionRows.length > 0) ||
					(Array.isArray(p.prioriteRows) && p.prioriteRows.length > 0) ||
					(Array.isArray(p.dicCriteriaRows) && p.dicCriteriaRows.length > 0) ||
					(Array.isArray(p.dicNiveauxRows) && p.dicNiveauxRows.length > 0) ||
					(Array.isArray(p.categoriesActifsRows) && p.categoriesActifsRows.length > 0) ||
					(Array.isArray(p.probaRows) && p.probaRows.length > 0) ||
					(Array.isArray(p.impactRows) && p.impactRows.length > 0) ||
					(Array.isArray(p.impactDefinitionsRows) && p.impactDefinitionsRows.length > 0) ||
					(Array.isArray(p.frequenceRisqueRows) && p.frequenceRisqueRows.length > 0) ||
					(Array.isArray(p.matriceRisqueRows) && p.matriceRisqueRows.length > 0) ||
					(Array.isArray(p.efficaciteRows) && p.efficaciteRows.length > 0)
				);
			});

			if (!hasPerProjectScales) {
				// Aucune donnée "par projet" encore présente : on distribue la référence comme point de départ
				const ref = getReferenceState();
				for (const [id, p] of Object.entries(loadedProjects)) {
					if (!Array.isArray(p.periodiciteRows) || p.periodiciteRows.length === 0) {
						p.periodiciteRows = (ref.periodiciteRows ?? []).map((r) => ({ ...r }));
					}
					if (!Array.isArray(p.complexiteRows) || p.complexiteRows.length === 0) {
						p.complexiteRows = (ref.complexiteRows ?? []).map((r) => ({ ...r }));
					}
					if (!Array.isArray(p.typeActionRows) || p.typeActionRows.length === 0) {
						p.typeActionRows = (ref.typeActionRows ?? []).map((r) => ({ ...r }));
					}
					if (!Array.isArray(p.prioriteRows) || p.prioriteRows.length === 0) {
						p.prioriteRows = (ref.prioriteRows ?? []).map((r) => ({ ...r }));
					}
					if (!Array.isArray(p.dicCriteriaRows) || p.dicCriteriaRows.length === 0) {
						p.dicCriteriaRows = (ref.dicCriteriaRows ?? []).map((r) => ({ ...r }));
					}
					if (!Array.isArray(p.dicNiveauxRows) || p.dicNiveauxRows.length === 0) {
						p.dicNiveauxRows = (ref.dicNiveauxRows ?? []).map((r) => ({ ...r }));
					}
					if (!Array.isArray(p.categoriesActifsRows) || p.categoriesActifsRows.length === 0) {
						p.categoriesActifsRows = (ref.categoriesActifsRows ?? []).map((r) => ({ ...r }));
					}
					if (!Array.isArray(p.probaRows) || p.probaRows.length === 0) {
						p.probaRows = (ref.probaRows ?? []).map((r) => ({ ...r }));
					}
					if (!Array.isArray(p.impactRows) || p.impactRows.length === 0) {
						p.impactRows = (ref.impactRows ?? []).map((r) => ({ ...r }));
					}
					if (!Array.isArray(p.impactDefinitionsRows) || p.impactDefinitionsRows.length === 0) {
						p.impactDefinitionsRows = (ref.impactDefinitionsRows ?? []).map((r) => ({ ...r }));
					}
					if (!Array.isArray(p.frequenceRisqueRows) || p.frequenceRisqueRows.length === 0) {
						p.frequenceRisqueRows = (ref.frequenceRisqueRows ?? []).map((r) => ({ ...r }));
					}
					if (!Array.isArray(p.matriceRisqueRows) || p.matriceRisqueRows.length === 0) {
						p.matriceRisqueRows = (ref.matriceRisqueRows ?? []).map((r) => ({
							libelle: r.libelle,
							valeurs: [...r.valeurs]
						}));
					}
					if (!Array.isArray(p.efficaciteRows) || p.efficaciteRows.length === 0) {
						p.efficaciteRows = (ref.efficaciteRows ?? []).map((r) => ({ ...r }));
					}
					loadedProjects[id] = p;
				}
			}

			projects = loadedProjects;
			activeProjectId = String(state.activeProjectId);
			const proj = projects[activeProjectId];
			if (proj) {
				applyProjectData(proj);
			} else {
				// Projet actif manquant : créer un projet par défaut avec les données vides
				const empty = getDefaultProjectData();
				projects[activeProjectId] = { ...empty, name: 'Projet par défaut' };
				applyProjectData(projects[activeProjectId]);
			}
			// Ne pas appeler syncPtrFromCartographie() après chargement : le PTR a déjà été restauré
			// par applyProjectData (y compris les lignes ajoutées manuellement dans le PTR).
			return;
		}
		// Legacy: état mono-projet (tout dans un seul objet)
		const sectionIds: SectionId[] = ['controle-document', 'registre-classification', 'aide-classification', 'cartographie-risques', 'aide-risque', 'synthese', 'ptr', 'echelle-ptr', 'parametrage'];
		const cartoViews = ['all', 'identification', 'brut', 'net', 'ptr'] as const;
		// Définitions des impacts (avant cartoRows pour sync)
		if (state.impactDefinitionsRows && Array.isArray(state.impactDefinitionsRows) && (state.impactDefinitionsRows as ImpactDefinition[]).length > 0) {
			impactDefinitionsRows = state.impactDefinitionsRows as ImpactDefinition[];
		}
		// Cartographie des risques: nombre de lignes variable (ajout/suppression), toujours au moins 1 ligne
		if (state.cartoRows && Array.isArray(state.cartoRows)) {
			const arr = (state.cartoRows as CartoRow[]).map((r, i) => {
				const merged = { ...defaultCartoRow(), ...r } as CartoRow;
				const def = cartoRowDefaults[i];
				if (def) {
					for (const k of Object.keys(def) as (keyof CartoRow)[]) {
						const val = def[k];
						if (val === undefined) continue;
						const current = merged[k];
						if (current === undefined || current === '') merged[k] = val as CartoRow[keyof CartoRow];
					}
				}
				merged.impacts = getRowImpacts(merged);
				return merged;
			});
			cartoRows = arr.length > 0 ? arr : [defaultCartoRow()];
		}
		if (state.redactionRows && Array.isArray(state.redactionRows) && state.redactionRows.length > 0) {
			redactionRows = state.redactionRows as RedactionRow[];
		}
		if (state.diffusionRows && Array.isArray(state.diffusionRows) && state.diffusionRows.length > 0) {
			diffusionRows = state.diffusionRows as DiffusionRow[];
		}
		if (state.versionRows && Array.isArray(state.versionRows) && state.versionRows.length > 0) {
			versionRows = state.versionRows as VersionRow[];
		}
		if (state.registreRows && Array.isArray(state.registreRows) && state.registreRows.length > 0) {
			const raw = state.registreRows as Record<string, unknown>[];
			registreRows = raw.map((r) => ({ ...defaultRegistreRow(), ...r })) as RegistreRow[];
		}
		if (typeof state.showRegistreLoi0520 === 'boolean') {
			showRegistreLoi0520 = state.showRegistreLoi0520;
		}
		if (state.activeSection && sectionIds.includes(state.activeSection as SectionId)) {
			activeSection = state.activeSection as SectionId;
		}
		if (state.cartoView && cartoViews.includes(state.cartoView as typeof cartoView)) {
			cartoView = state.cartoView as typeof cartoView;
		}
		if (state.cartoVersion === 'A' || state.cartoVersion === 'B') {
			cartoVersion = state.cartoVersion;
		}
		if (state.periodiciteRows && Array.isArray(state.periodiciteRows) && state.periodiciteRows.length > 0) {
			const rows = state.periodiciteRows as Row[];
			periodiciteRows = rows.map((r) => ({ ...r, bgColor: r.bgColor || getPeriodiciteBgDefault(r.periodicite) }));
		}
		if (state.complexiteRows && Array.isArray(state.complexiteRows) && state.complexiteRows.length > 0) {
			const rows = state.complexiteRows as Row[];
			complexiteRows = rows.map((r) => ({ ...r, bgColor: r.bgColor || getComplexiteBgDefault(r.complexite) }));
		}
		if (state.typeActionRows && Array.isArray(state.typeActionRows) && state.typeActionRows.length > 0) {
			const rows = state.typeActionRows as Row[];
			typeActionRows = rows.map((r) => ({ ...r, bgColor: r.bgColor || getTypeActionBgDefault(r.type_action) }));
		}
		if (state.prioriteRows && Array.isArray(state.prioriteRows) && state.prioriteRows.length > 0) {
			const rows = state.prioriteRows as Row[];
			prioriteRows = rows.map((r) => ({ ...r, bgColor: r.bgColor || getPrioriteDefinitionBgDefault(r.echelle) }));
		}
		if (state.dicCriteriaRows && Array.isArray(state.dicCriteriaRows) && state.dicCriteriaRows.length > 0) {
			dicCriteriaRows = state.dicCriteriaRows as DICCriteriaRow[];
		}
		if (state.dicNiveauxRows && Array.isArray(state.dicNiveauxRows) && state.dicNiveauxRows.length > 0) {
			const rows = state.dicNiveauxRows as DICNiveauRow[];
			dicNiveauxRows = rows.map((r) => ({
				...r,
				bgColor: r.bgColor || getValeurBgDefault(r.valeur)
			}));
		}
		if (state.categoriesActifsRows && Array.isArray(state.categoriesActifsRows)) {
			const raw = state.categoriesActifsRows as (string | CategorieActifRow)[];
			categoriesActifsRows = raw.map((c) => {
				if (typeof c === 'object' && c !== null && 'libelle' in c) {
					const row = c as CategorieActifRow;
					const lib = row.libelle ?? '';
					const t = (row.type_actif || '').trim();
					const typeOk = t === 'Actif primaire' || t === 'Actif support' ? t : defaultCategorieActifRow(lib).type_actif;
					return { libelle: lib, type_actif: typeOk };
				}
				return defaultCategorieActifRow(typeof c === 'string' ? c : '');
			});
		}
		if (state.probaRows && Array.isArray(state.probaRows) && state.probaRows.length > 0) {
			const rows = state.probaRows as ProbaRow[];
			probaRows = rows.map((r) => ({ ...r, bgColor: r.bgColor ?? getProbaDefBg(r.definition) }));
		}
		if (state.impactRows && Array.isArray(state.impactRows) && state.impactRows.length > 0) {
			const rows = state.impactRows as ImpactRow[];
			impactRows = rows.map((r) => ({ ...r, bgColor: r.bgColor ?? getImpactDefBg(r.definition) }));
			syncImpactRowsCriteres();
		}
		if (state.frequenceRisqueRows && Array.isArray(state.frequenceRisqueRows) && state.frequenceRisqueRows.length > 0) {
			const rows = state.frequenceRisqueRows as (Row & { bgColor?: string })[];
			frequenceRisqueRows = rows.map((r) => ({ ...r, bgColor: r.bgColor ?? getFrequenceDefBg(r.definition ?? '') }));
		}
		if (state.matriceRisqueRows && Array.isArray(state.matriceRisqueRows) && state.matriceRisqueRows.length > 0) {
			const rows = state.matriceRisqueRows as MatriceRow[];
			if (rows.every((r) => r && typeof r.libelle === 'string' && Array.isArray(r.valeurs))) {
				matriceRisqueRows = rows.map((r) => ({ libelle: r.libelle, valeurs: [...r.valeurs] }));
			}
		}
		if (state.efficaciteRows && Array.isArray(state.efficaciteRows) && state.efficaciteRows.length > 0) {
			const rows = state.efficaciteRows as EfficaciteRow[];
			efficaciteRows = rows.map((r) => ({ ...r, bgColor: r.bgColor ?? getEfficaciteDefBg(r.signification) }));
		}
		// Tableau PTR (Plan de Traitement des Risques)
		if (state.ptrData && Array.isArray(state.ptrData) && state.ptrData.length > 0) {
			const rows = state.ptrData as Array<Record<string, unknown>>;
			ptrData = rows.map((r, i) => ({
				id: typeof r.id === 'number' ? r.id : i + 1,
				refRisque: String(r.refRisque ?? ''),
				correspISO: String(r.correspISO ?? ''),
				proprietaire: String(r.proprietaire ?? ''),
				niveauRisque: String(r.niveauRisque ?? ''),
				decision: String(r.decision ?? ''),
				idPTR: String(r.idPTR ?? ''),
				action: String(r.action ?? ''),
				typeAction: String(r.typeAction ?? ''),
				porteur: String(r.porteur ?? ''),
				priorite: String(r.priorite ?? ''),
				periodicite: String(r.periodicite ?? ''),
				complexite: String(r.complexite ?? ''),
				echeance: String(r.echeance ?? ''),
				etatAvancement: String(r.etatAvancement ?? '')
			}));
		} else {
			// Pas de PTR sauvegardé : reconstruire à partir de la cartographie
			syncPtrFromCartographie();
		}
		// Migration vers format multi-projets : au prochain save, l'état sera en version 2
		activeProjectId = DEFAULT_PROJECT_ID;
		projects = { [DEFAULT_PROJECT_ID]: getCurrentProjectData() };
	}

	function getProbaDefBg(definition: string): string {
		switch (definition) {
			case 'Très faible':
				return 'bg-green-400 border border-green-600 text-black';
			case 'Faible':
				return 'bg-yellow-300 border border-yellow-500 text-black';
			case 'Moyen':
				return 'bg-orange-400 border border-orange-600 text-black';
			case 'Forte':
				return 'bg-red-500 border border-red-600 text-black';
			case 'Très forte':
				return 'bg-red-700 border border-red-800 text-black';
			default:
				return 'bg-white border border-gray-300 text-black';
		}
	}
	function getProbaRowBg(row: ProbaRow): string {
		return row.bgColor ?? getProbaDefBg(row.definition);
	}

	function getImpactDefBg(definition: string): string {
		switch (definition) {
			case 'Très faible':
				return 'bg-green-400 border border-green-600 text-black';
			case 'Faible':
				return 'bg-yellow-300 border border-yellow-500 text-black';
			case 'Moyen':
				return 'bg-orange-400 border border-orange-600 text-black';
			case 'Fort':
				return 'bg-red-500 border border-red-600 text-black';
			case 'Très fort':
				return 'bg-red-700 border border-red-800 text-black';
			case 'Critique':
				return 'bg-red-900 border border-red-950 text-white';
			default:
				return 'bg-white border border-gray-300 text-black';
		}
	}
	function getImpactRowBg(row: ImpactRow): string {
		return row.bgColor ?? getImpactDefBg(row.definition);
	}

	/** Retourne le tableau des valeurs par critère pour une ligne du Tableau 2 (longueur = impactDefinitionsRows.length). Utilise criteres si présent, sinon dérive des champs fixes (financier, reputation, etc.) selon le libellé. */
	function getImpactRowCriteres(row: ImpactRow): string[] {
		const n = impactDefinitionsRows.length;
		const legacyByKey: Record<string, string> = {
			financier: row.financier ?? '',
			reputation: row.reputation ?? '',
			parties_prenantes: row.parties_prenantes ?? '',
			reglementaire: row.reglementaire ?? ''
		};
		const libelleToKey = (lib: string): keyof typeof legacyByKey | null => {
			const l = (lib || '').toLowerCase();
			if (l.includes('financier')) return 'financier';
			if (l.includes('réputation') || l.includes('reputation')) return 'reputation';
			if (l.includes('parties prenantes') || l.includes('parties prenante')) return 'parties_prenantes';
			if (l.includes('réglementaire') || l.includes('reglementaire')) return 'reglementaire';
			return null;
		};
		let arr: string[] =
			row.criteres && row.criteres.length >= n
				? row.criteres.slice(0, n)
				: impactDefinitionsRows.map((def) => {
						const k = libelleToKey(def.libelle);
						return k ? legacyByKey[k] ?? '' : '';
					});
		while (arr.length < n) arr.push('À déterminer');
		return arr;
	}

	/** Synchronise les colonnes critères du Tableau 2 avec impactDefinitionsRows (ajout = 'À déterminer', suppression = trim). */
	function syncImpactRowsCriteres() {
		impactRows = impactRows.map((r) => ({ ...r, criteres: getImpactRowCriteres(r) }));
	}

	function getFrequenceDefBg(definition: string): string {
		switch (definition) {
			case 'Risque Faible':
				return 'bg-green-400 border border-green-600 text-black';
			case 'Risque Modéré':
				return 'bg-yellow-300 border border-yellow-500 text-black';
			case 'Risque Elevé':
				return 'bg-orange-400 border border-orange-600 text-black';
			case 'Risque Extrême':
				return 'bg-red-500 border border-red-600 text-black';
			default:
				return 'bg-white border border-gray-300 text-black';
		}
	}
	function getFrequenceRowBg(row: Row): string {
		return (row as Row & { bgColor?: string }).bgColor ?? getFrequenceDefBg(row.definition ?? '');
	}

	function getEfficaciteDefBg(signification: string): string {
		switch (signification) {
			case 'Insuffisant':
				return 'bg-[#ff0000] border border-[#cc0000] text-black';
			case 'Faible':
				return 'bg-[#ffc000] border border-[#e0a800] text-black';
			case 'Acceptable':
				return 'bg-[#ffff00] border border-[#d4d400] text-black';
			case 'Efficace':
				return 'bg-[#92d050] border border-[#7ab83e] text-black';
			case 'Exemplaire':
				return 'bg-[#00b050] border border-[#009040] text-white';
			default:
				return 'bg-white border border-gray-300 text-black';
		}
	}
	function getEfficaciteRowBg(row: EfficaciteRow): string {
		return row.bgColor ?? getEfficaciteDefBg(row.signification);
	}

	/** Parse "signification" (ex: "[1 – 20[" or "[64 – 120]") into min, max and whether max is inclusive. */
	function parseInterval(signification: string): { min: number; max: number; maxInclusive: boolean } | null {
		if (!signification || typeof signification !== 'string') return null;
		const match = signification.match(/(\d+)\s*[–\-]\s*(\d+)/);
		if (!match) return null;
		const min = parseInt(match[1], 10);
		const max = parseInt(match[2], 10);
		const maxInclusive = /\]\s*$/.test(signification.trim());
		return { min, max, maxInclusive };
	}
	/** Couleur d'une cellule de la matrice selon les intervalles du tableau Fréquence / Probabilité d'occurrence. */
	function getMatriceCellBgFromFrequence(valeur: number): string {
		const rows = frequenceRisqueRows as (Row & { bgColor?: string })[];
		const num = Number(valeur);
		if (rows.length === 0) return 'bg-white text-black';
		const intervals = rows
			.map((r) => {
				const parsed = parseInterval(r.signification ?? '');
				return parsed ? { ...parsed, row: r } : null;
			})
			.filter(Boolean) as { min: number; max: number; maxInclusive: boolean; row: Row & { bgColor?: string } }[];
		intervals.sort((a, b) => a.min - b.min);
		for (const it of intervals) {
			const inRange = it.maxInclusive
				? num >= it.min && num <= it.max
				: num >= it.min && num < it.max;
			if (inRange) return getFrequenceRowBg(it.row);
		}
		return 'bg-white text-black';
	}

	// Fonctions pour ajouter/supprimer des lignes
	// Fonctions génériques pour ajouter/supprimer des lignes à n'importe quelle position
	function insererLigneAvant(array: any[], index: number, nouvelleValeur: any) {
		const result = [...array];
		result.splice(index, 0, nouvelleValeur);
		return result;
	}

	function insererLigneApres(array: any[], index: number, nouvelleValeur: any) {
		const result = [...array];
		result.splice(index + 1, 0, nouvelleValeur);
		return result;
	}

	function supprimerLigneAt(array: any[], index: number) {
		return array.filter((_, i) => i !== index);
	}

	function ajouterLigneDiffusion() {
		diffusionRows = [...diffusionRows, { nom: '', entite_fonction: '', date: '' }];
		saveCustomMethodState();
	}

	function supprimerLigneDiffusion(index: number) {
		diffusionRows = diffusionRows.filter((_, i) => i !== index);
		saveCustomMethodState();
	}

	function insererLigneDiffusionAvant(index: number) {
		diffusionRows = insererLigneAvant(diffusionRows, index, { nom: '', entite_fonction: '', date: '' });
		saveCustomMethodState();
	}

	function insererLigneDiffusionApres(index: number) {
		diffusionRows = insererLigneApres(diffusionRows, index, { nom: '', entite_fonction: '', date: '' });
		saveCustomMethodState();
	}

	function ajouterLigneVersion() {
		versionRows = [...versionRows, { version: '', date: '', modification: '' }];
		saveCustomMethodState();
	}

	function supprimerLigneVersion(index: number) {
		versionRows = versionRows.filter((_, i) => i !== index);
		saveCustomMethodState();
	}

	function insererLigneVersionAvant(index: number) {
		versionRows = insererLigneAvant(versionRows, index, { version: '', date: '', modification: '' });
		saveCustomMethodState();
	}

	function insererLigneVersionApres(index: number) {
		versionRows = insererLigneApres(versionRows, index, { version: '', date: '', modification: '' });
		saveCustomMethodState();
	}

	// Fonctions pour tableau Rédaction (Contrôle du document)
	function ajouterLigneRedaction() {
		redactionRows = [...redactionRows, { role: '', nom: '', fonction: '', date: '' }];
		saveCustomMethodState();
	}

	function supprimerLigneRedaction(index: number) {
		redactionRows = redactionRows.filter((_, i) => i !== index);
		saveCustomMethodState();
	}

	function insererLigneRedactionAvant(index: number) {
		redactionRows = insererLigneAvant(redactionRows, index, { role: '', nom: '', fonction: '', date: '' });
		saveCustomMethodState();
	}

	function insererLigneRedactionApres(index: number) {
		redactionRows = insererLigneApres(redactionRows, index, { role: '', nom: '', fonction: '', date: '' });
		saveCustomMethodState();
	}

	function ajouterCategorieActif() {
		categoriesActifsRows = [...categoriesActifsRows, defaultCategorieActifRow('')];
	}

	function supprimerCategorieActif(index: number) {
		categoriesActifsRows = categoriesActifsRows.filter((_, i) => i !== index);
	}

	function insererCategorieActifAvant(index: number) {
		categoriesActifsRows = insererLigneAvant(categoriesActifsRows, index, defaultCategorieActifRow(''));
	}

	function insererCategorieActifApres(index: number) {
		categoriesActifsRows = insererLigneApres(categoriesActifsRows, index, defaultCategorieActifRow(''));
	}

	// Fonctions pour tableaux Aide-Risque (Probabilité, Impact)
	function defaultProbaRow(): ProbaRow {
		return { echelle: '', definition: '', frequence: '', historique: '', bgColor: 'bg-white text-black' };
	}
	function insererProbaAvant(index: number) {
		probaRows = insererLigneAvant(probaRows, index, defaultProbaRow());
	}
	function insererProbaApres(index: number) {
		probaRows = insererLigneApres(probaRows, index, defaultProbaRow());
	}
	function ajouterProba() {
		probaRows = [...probaRows, defaultProbaRow()];
	}

	function supprimerProba(index: number) {
		probaRows = supprimerLigneAt(probaRows, index);
	}

	function defaultImpactRow(): ImpactRow {
		const n = impactDefinitionsRows.length;
		const criteres = Array(n).fill('À déterminer');
		return { echelle: '', definition: '', financier: '', reputation: '', parties_prenantes: '', reglementaire: '', criteres, bgColor: 'bg-white text-black' };
	}
	function insererImpactAvant(index: number) {
		impactRows = insererLigneAvant(impactRows, index, defaultImpactRow());
	}
	function insererImpactApres(index: number) {
		impactRows = insererLigneApres(impactRows, index, defaultImpactRow());
	}
	function ajouterImpact() {
		impactRows = [...impactRows, defaultImpactRow()];
	}

	// Fonctions pour Échelle-PTR (Periodicité / Complexité / TypeAction / Priorité)

	function ajouterPeriodicite() {
		periodiciteRows = [...periodiciteRows, { periodicite: '', duree: '', bgColor: 'bg-white' }];
	}

	function supprimerPeriodicite(index: number) {
		periodiciteRows = periodiciteRows.filter((_, i) => i !== index);
	}

	function insererPeriodiciteAvant(index: number) {
		periodiciteRows = insererLigneAvant(periodiciteRows, index, { periodicite: '', duree: '', bgColor: 'bg-white' });
	}

	function insererPeriodiciteApres(index: number) {
		periodiciteRows = insererLigneApres(periodiciteRows, index, { periodicite: '', duree: '', bgColor: 'bg-white' });
	}

	function ajouterComplexite() {
		complexiteRows = [...complexiteRows, { complexite: '', definition: '', bgColor: 'bg-white text-black' }];
	}

	function supprimerComplexite(index: number) {
		complexiteRows = complexiteRows.filter((_, i) => i !== index);
	}

	function insererComplexiteAvant(index: number) {
		complexiteRows = insererLigneAvant(complexiteRows, index, { complexite: '', definition: '', bgColor: 'bg-white text-black' });
	}

	function insererComplexiteApres(index: number) {
		complexiteRows = insererLigneApres(complexiteRows, index, { complexite: '', definition: '', bgColor: 'bg-white text-black' });
	}

	function ajouterTypeAction() {
		typeActionRows = [...typeActionRows, { type_action: '', description: '', bgColor: 'bg-white' }];
	}

	function supprimerTypeAction(index: number) {
		typeActionRows = typeActionRows.filter((_, i) => i !== index);
	}

	function insererTypeActionAvant(index: number) {
		typeActionRows = insererLigneAvant(typeActionRows, index, { type_action: '', description: '', bgColor: 'bg-white' });
	}

	function insererTypeActionApres(index: number) {
		typeActionRows = insererLigneApres(typeActionRows, index, { type_action: '', description: '', bgColor: 'bg-white' });
	}

	function ajouterPriorite() {
		prioriteRows = [...prioriteRows, { echelle: '', definition: '', signification: '', bgColor: 'bg-white text-black' }];
	}

	function supprimerPriorite(index: number) {
		prioriteRows = prioriteRows.filter((_, i) => i !== index);
	}

	function insererPrioriteAvant(index: number) {
		prioriteRows = insererLigneAvant(prioriteRows, index, { echelle: '', definition: '', signification: '', bgColor: 'bg-white text-black' });
	}

	function insererPrioriteApres(index: number) {
		prioriteRows = insererLigneApres(prioriteRows, index, { echelle: '', definition: '', signification: '', bgColor: 'bg-white text-black' });
	}

	function supprimerImpact(index: number) {
		impactRows = supprimerLigneAt(impactRows, index);
	}

	/** Synchronise les tableaux impacts de chaque ligne carto avec impactDefinitionsRows (ajout/suppression de colonnes) */
	function syncCartoRowsImpacts() {
		const n = impactDefinitionsRows.length;
		cartoRows = cartoRows.map((r) => ({ ...r, impacts: getRowImpacts(r).slice(0, n).concat(Array(Math.max(0, n - getRowImpacts(r).length)).fill('')) }));
	}

	function ajouterDefinitionImpact() {
		impactDefinitionsRows = [...impactDefinitionsRows, { libelle: 'Nouvel impact', definition: '' }];
		syncCartoRowsImpacts();
		syncImpactRowsCriteres();
		saveCustomMethodState();
	}

	function supprimerDefinitionImpact(index: number) {
		if (impactDefinitionsRows.length <= 1) return;
		impactDefinitionsRows = impactDefinitionsRows.filter((_, i) => i !== index);
		syncCartoRowsImpacts();
		syncImpactRowsCriteres();
		saveCustomMethodState();
	}

	function defaultFrequenceRow(): Row & { bgColor?: string } {
		return { echelle: '', definition: '', signification: '', bgColor: 'bg-white text-black' };
	}
	function insererFrequenceAvant(index: number) {
		frequenceRisqueRows = insererLigneAvant(frequenceRisqueRows, index, defaultFrequenceRow());
	}
	function insererFrequenceApres(index: number) {
		frequenceRisqueRows = insererLigneApres(frequenceRisqueRows, index, defaultFrequenceRow());
	}
	function ajouterFrequence() {
		frequenceRisqueRows = [...frequenceRisqueRows, defaultFrequenceRow()];
	}
	function supprimerFrequence(index: number) {
		frequenceRisqueRows = supprimerLigneAt(frequenceRisqueRows, index);
	}
	function defaultEfficaciteRow(): EfficaciteRow {
		return { niveau: '', signification: '', descriptif: '', intervalle: '', valeur: '', bgColor: 'bg-white text-black' };
	}
	function insererEfficaciteAvant(index: number) {
		efficaciteRows = insererLigneAvant(efficaciteRows, index, defaultEfficaciteRow());
		saveCustomMethodState();
	}
	function insererEfficaciteApres(index: number) {
		efficaciteRows = insererLigneApres(efficaciteRows, index, defaultEfficaciteRow());
		saveCustomMethodState();
	}
	function ajouterEfficacite() {
		efficaciteRows = [...efficaciteRows, defaultEfficaciteRow()];
		saveCustomMethodState();
	}
	function supprimerEfficacite(index: number) {
		efficaciteRows = supprimerLigneAt(efficaciteRows, index);
		saveCustomMethodState();
	}

	/**
	 * Les binds sur efficaciteRows[i].x sont des mutations profondes : on force l'invalidation
	 * pour que la cartographie recalcule immédiatement, et on sauvegarde sur validation.
	 */
	function invalidateEfficaciteRows() {
		efficaciteRows = [...efficaciteRows];
	}
	function commitEfficaciteRows() {
		invalidateEfficaciteRows();
		saveCustomMethodState();
	}
	function getMatriceColumnCount(): number {
		return matriceRisqueRows[0]?.valeurs?.length ?? 5;
	}
	function defaultMatriceRow(): MatriceRow {
		return { libelle: '', valeurs: Array(getMatriceColumnCount()).fill(0) };
	}
	function insererMatriceAvant(index: number) {
		const n = getMatriceColumnCount();
		matriceRisqueRows = insererLigneAvant(matriceRisqueRows, index, { libelle: '', valeurs: Array(n).fill(0) });
	}
	function insererMatriceApres(index: number) {
		const n = getMatriceColumnCount();
		matriceRisqueRows = insererLigneApres(matriceRisqueRows, index, { libelle: '', valeurs: Array(n).fill(0) });
	}
	function ajouterMatrice() {
		const n = getMatriceColumnCount();
		matriceRisqueRows = [...matriceRisqueRows, { libelle: '', valeurs: Array(n).fill(0) }];
	}
	function supprimerMatrice(index: number) {
		matriceRisqueRows = matriceRisqueRows.filter((_, i) => i !== index);
	}
	/** Ajoute une colonne de données avant la colonne Actions ; en-tête = n+1 (n = ancien dernier numéro). */
	function ajouterColonneMatrice() {
		matriceRisqueRows = matriceRisqueRows.map((r) => ({ ...r, valeurs: [...r.valeurs, 0] }));
	}
	function supprimerColonneMatrice(colIndex: number) {
		if (getMatriceColumnCount() <= 1) return;
		matriceRisqueRows = matriceRisqueRows.map((r) => ({
			...r,
			valeurs: r.valeurs.filter((_, j) => j !== colIndex)
		}));
	}

	// Fonctions pour PTR (addRow/deleteRow existantes, mais ajouter les variantes)
	function insererPtrAvant(index: number) {
		const newRow = {
			id: ptrData.length + 1,
			refRisque: '',
			correspISO: '',
			proprietaire: '',
			niveauRisque: '',
			decision: '',
			idPTR: '',
			action: '',
			typeAction: '',
			porteur: '',
			priorite: '',
			periodicite: '',
			complexite: '',
			echeance: '',
			etatAvancement: ''
		};
		ptrData = insererLigneAvant(ptrData, index, newRow);
		ptrData = ptrData.map((row, i) => ({ ...row, id: i + 1 }));
	}

	function insererPtrApres(index: number) {
		const newRow = {
			id: ptrData.length + 1,
			refRisque: '',
			correspISO: '',
			proprietaire: '',
			niveauRisque: '',
			decision: '',
			idPTR: '',
			action: '',
			typeAction: '',
			porteur: '',
			priorite: '',
			periodicite: '',
			complexite: '',
			echeance: '',
			etatAvancement: ''
		};
		ptrData = insererLigneApres(ptrData, index, newRow);
		ptrData = ptrData.map((row, i) => ({ ...row, id: i + 1 }));
	}

	// Parties (sous-groupes) de la cartographie par code risque (DSI-R-SP, DSI-R-PSE, etc.)
	const CARTO_PART_TITLES: Record<number, string> = {
		1: "1 – Sinistres physiques / Evènements naturels / Perturbations dues aux rayonnements",
		2: "2 – Perte de services essentiels",
		3: "3 – Compromission des informations",
		4: "4 – Compromission des fonctions",
		5: "5 – Acte illicite",
		6: "6 – Mise en production non maîtrisée",
		7: "7 – Conformité légale et réglementaire",
		8: "8 – Tiers"
	};
	/** Retourne le numéro de partie (1-8) à partir du code risque, 0 si inconnu/vide */
	function getPartFromCodeRisque(code: string): number {
		const c = (code || '').trim().toUpperCase().replace(/O/g, '0');
		if (!c) return 0;
		if (c.includes('R-PSE')) return 2;
		if (c.includes('R-SP')) return 1;
		if (c.includes('R-CI')) return 3;
		if (c.includes('R-CF')) return 4;
		if (c.includes('R-AI')) return 5;
		if (c.includes('R-MP')) return 6;
		if (c.includes('R-CL')) return 7;
		if (c.includes('R-TIER')) return 8;
		return 0;
	}

	// Fonctions pour la cartographie des risques (tableau modifiable : ajout/suppression de lignes, toujours sauvegardé)
	// Les lignes ajoutées sont vides ; l'insertion avant/après garde la nouvelle ligne dans la même partie que la ligne cible.
	function insererLigneCartoAvant(index: number) {
		cartoRows = insererLigneAvant(cartoRows, index, defaultCartoRow());
		saveCustomMethodState();
	}
	function insererLigneCartoApres(index: number) {
		cartoRows = insererLigneApres(cartoRows, index, defaultCartoRow());
		saveCustomMethodState();
	}
	function supprimerLigneCarto(index: number) {
		if (cartoRows.length <= 1) return;
		cartoRows = cartoRows.filter((_, i) => i !== index);
		saveCustomMethodState();
	}
	function ajouterLigneCarto() {
		cartoRows = [...cartoRows, defaultCartoRow()];
		saveCustomMethodState();
	}

	/** Ordre des 7 cases "Catégorie d'actifs" de la carto → indices dans categoriesActifsRows (0..6) */
	const CARTO_ACTIF_CHECKBOX_TO_CATEGORY_INDEX = [0, 1, 2, 3, 4, 5, 6] as const;

	/** Retourne les libellés de catégories d'actifs sélectionnés pour une ligne de cartographie (cases cochées). */
	function getCategoriesFromCartoRow(row: CartoRow): string[] {
		const checks = [
			row.actifMateriel,
			row.actifApplication,
			row.actifEquipementsSecurite,
			row.actifEquipementsReseaux,
			row.actifRessourcesHumaines,
			row.actifDocument,
			row.actifDonnees
		];
		const out: string[] = [];
		for (let k = 0; k < CARTO_ACTIF_CHECKBOX_TO_CATEGORY_INDEX.length && k < categoriesActifsRows.length; k++) {
			const cat = categoriesActifsRows[k];
			const lib = typeof cat === 'string' ? cat : (cat?.libelle ?? '');
			if (checks[k] && lib.trim()) out.push(lib.trim());
		}
		return out.filter(Boolean);
	}

	/** Niveau numérique (1..n) pour un besoin D/I/C à partir de la valeur du registre (ex. "Faible", "Moyen", "Élevé"). */
	function getNiveauLevelForDIC(valeur: string): number {
		const v = (valeur || '').trim();
		if (!v) return 0;
		const idx = dicNiveauxRows.findIndex((r) => (r.valeur || '').trim() === v);
		return idx >= 0 ? idx + 1 : 0;
	}

	/** Calcule D, I, C pour une ligne de carto à partir du registre : filtre par catégories cochées, puis max des besoins D/I/C. */
	function computeImpactDICFromRegistre(row: CartoRow): { d: number; i: number; c: number } {
		const categories = getCategoriesFromCartoRow(row);
		if (categories.length === 0) return { d: 0, i: 0, c: 0 };
		const filtered = registreRows.filter(
			(r) => categories.indexOf((r.categorie_actif || '').trim()) >= 0
		);
		let d = 0,
			i = 0,
			c = 0;
		for (const r of filtered) {
			d = Math.max(d, getNiveauLevelForDIC(r.disponibilite));
			i = Math.max(i, getNiveauLevelForDIC(r.integrite));
			c = Math.max(c, getNiveauLevelForDIC(r.confidentialite));
		}
		return { d, i, c };
	}

	/** Recalcule et met à jour impactD, impactI, impactC pour une ligne de cartographie à partir du registre. Ne remplit que les impacts dont le critère (D, I, C) est sélectionné dans l'identification des risques inhérents. */
	function recalcImpactDICForCartoRow(index: number, options?: { skipSave?: boolean }) {
		const row = cartoRows[index];
		if (!row) return;
		const { d, i, c } = computeImpactDICFromRegistre(row);
		cartoRows[index].impactD = row.dicD && d > 0 ? d : '';
		cartoRows[index].impactI = row.dicI && i > 0 ? i : '';
		cartoRows[index].impactC = row.dicC && c > 0 ? c : '';
		if (!options?.skipSave) saveCustomMethodState();
	}

	/** Recalcule D/I/C pour toutes les lignes de cartographie qui ont la catégorie d’actif donnée dans leurs cases cochées (après modification d’un besoin dans le registre). N’appelle pas save. */
	function recalcCartoImpactDICForRegistreCategory(categorieActif: string) {
		const cat = (categorieActif || '').trim();
		if (!cat) return;
		cartoRows.forEach((row, idx) => {
			if (getCategoriesFromCartoRow(row).indexOf(cat) >= 0) {
				recalcImpactDICForCartoRow(idx, { skipSave: true });
			}
		});
	}

	// Fonctions pour le registre de classification
	const defaultRegistreRow = (): RegistreRow => ({
		id: '',
		processus_metier: '',
		activite_sous_processus: '',
		designation_actif: '',
		description_actif: '',
		categorie_actif: '',
		type_actif: '',
		proprietaire_actif: '',
		disponibilite: '',
		integrite: '',
		confidentialite: '',
		sensibilite: '',
		impactDispo0520: '',
		impactIntegrite0520: '',
		impactConfid0520: '',
		commentaire: ''
	});

	/** Données par défaut pour un nouveau projet (même structure, contenu vide) */
	function getDefaultProjectData(): ProjectData {
		return {
			name: 'Nouveau projet',
			redactionRows: [
				{ role: 'Écrit par :', nom: 'Consultants SSI', fonction: 'NEARSECURE', date: '' },
				{ role: 'Relu par :', nom: '', fonction: '', date: '' },
				{ role: 'Approuvé par :', nom: '', fonction: '', date: '' }
			],
			diffusionRows: [
				{ nom: '', entite_fonction: '', date: '' },
				{ nom: '', entite_fonction: '', date: '' },
				{ nom: '', entite_fonction: '', date: '' },
				{ nom: '', entite_fonction: '', date: '' }
			],
			versionRows: [
				{ version: '', date: '', modification: '' },
				{ version: '', date: '', modification: '' },
				{ version: '', date: '', modification: '' },
				{ version: '', date: '', modification: '' }
			],
			registreRows: [defaultRegistreRow()],
			showRegistreLoi0520: false,
			cartoRows: Array.from({ length: 45 }, (_, i) => {
				const merged = (cartoRowDefaults[i] ? { ...defaultCartoRow(), ...cartoRowDefaults[i] } : defaultCartoRow()) as CartoRow;
				merged.impacts = getRowImpacts(merged);
				return merged;
			}),
			ptrData: [],
			activeSection: 'controle-document',
			cartoView: 'identification',
			cartoVersion: 'A',
			// Par défaut, un nouveau projet reprend les tableaux/échelles actuellement chargés
			periodiciteRows: periodiciteRows.map((r) => ({ ...r })),
			complexiteRows: complexiteRows.map((r) => ({ ...r })),
			typeActionRows: typeActionRows.map((r) => ({ ...r })),
			prioriteRows: prioriteRows.map((r) => ({ ...r })),
			dicCriteriaRows: dicCriteriaRows.map((r) => ({ ...r })),
			dicNiveauxRows: dicNiveauxRows.map((r) => ({ ...r })),
			categoriesActifsRows: categoriesActifsRows.map((r) => ({ ...r })),
			probaRows: probaRows.map((r) => ({ ...r })),
			impactRows: impactRows.map((r) => ({ ...r })),
			impactDefinitionsRows: impactDefinitionsRows.map((r) => ({ ...r })),
			frequenceRisqueRows: frequenceRisqueRows.map((r) => ({ ...r })),
			matriceRisqueRows: matriceRisqueRows.map((r) => ({
				libelle: r.libelle,
				valeurs: [...r.valeurs]
			})),
			efficaciteRows: efficaciteRows.map((r) => ({ ...r }))
		};
	}

	function switchToProject(projectId: string) {
		if (projectId === activeProjectId) return;
		// Sauvegarder le projet actuel dans la map
		projects = { ...projects, [activeProjectId]: getCurrentProjectData() };
		activeProjectId = projectId;
		const proj = projects[projectId];
		if (proj) {
			applyProjectData(proj);
		} else {
			const empty = getDefaultProjectData();
			empty.name = projects[activeProjectId]?.name ?? 'Nouveau projet';
			projects[projectId] = empty;
			applyProjectData(empty);
		}
		syncPtrFromCartographie();
		saveCustomMethodState();
	}

	function addNewProject() {
		const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `projet-${Date.now()}`;
		const count = Object.keys(projects).length + 1;
		const newProj = getDefaultProjectData();
		newProj.name = `Projet ${count}`;
		projects[id] = newProj;
		projects = projects;
		switchToProject(id);
	}

	function renameProject(projectId: string, newName: string) {
		const p = projects[projectId];
		if (p && newName.trim()) {
			projects = { ...projects, [projectId]: { ...p, name: newName.trim() } };
			saveCustomMethodState();
		}
	}

	function deleteProject(projectId: string) {
		const ids = Object.keys(projects);
		if (ids.length <= 1) return;
		const nextId = ids.find((k) => k !== projectId) ?? DEFAULT_PROJECT_ID;
		// Si on supprime le projet actif, basculer d'abord sur l'autre sans ré-enregistrer le projet supprimé
		if (activeProjectId === projectId) {
			activeProjectId = nextId;
			const proj = projects[nextId];
			if (proj) {
				applyProjectData(proj);
			}
			syncPtrFromCartographie();
		}
		const next = { ...projects };
		delete next[projectId];
		projects = next;
		saveCustomMethodState();
	}

	function ajouterLigneRegistre() {
		registreRows = [...registreRows, defaultRegistreRow()];
	}

	function supprimerLigneRegistre(index: number) {
		registreRows = registreRows.filter((_, i) => i !== index);
	}

	function insererLigneRegistreAvant(index: number) {
		registreRows = insererLigneAvant(registreRows, index, defaultRegistreRow());
	}

	function insererLigneRegistreApres(index: number) {
		registreRows = insererLigneApres(registreRows, index, defaultRegistreRow());
	}

	function getNiveauBesoinBg(niveau: string): string {
		const row = dicNiveauxRows.find((r) => r.valeur === niveau);
		if (row?.bgColor) return `${row.bgColor} text-white`;
		return 'bg-white text-black';
	}

	/** Première lettre du niveau loi 05.20 : T (Très Grave), G (Grave), M (Modéré), L (Limité) */
	function firstLetter0520(val: string | undefined): string {
		const v = (val || '').trim();
		if (!v) return '';
		return v[0].toUpperCase();
	}

	/** Section 7 – Sensibilité de l'actif selon le référentiel loi 05.20 (Classe A/B/C/D) */
	function getSensibiliteClasse0520(row: RegistreRow): string {
		const m = firstLetter0520(row.impactDispo0520);
		const n = firstLetter0520(row.impactIntegrite0520);
		const o = firstLetter0520(row.impactConfid0520);
		if (m === 'T' || n === 'T' || o === 'T') return 'Classe A';
		if (m === 'G' || n === 'G' || o === 'G') return 'Classe B';
		if (m === 'M' || n === 'M' || o === 'M') return 'Classe C';
		return 'Classe D';
	}

	/** Section 7 – Confidentialité de l'actif selon le décret loi 05-20 (basé sur Impact Confidentialité) */
	function getConfidentialite0520(row: RegistreRow): string {
		const o = firstLetter0520(row.impactConfid0520);
		if (o === 'T') return 'Très secret';
		if (o === 'G') return 'Secret';
		if (o === 'M') return 'Confidentiel';
		return 'Diffusion Restreinte';
	}

	/** Couleur de fond de l'échelle loi 05.20 : TG → rouge, G → orange, M → jaune, L → vert */
	function getLoi0520ImpactBg(val: string | undefined): string {
		const letter = firstLetter0520(val);
		if (letter === 'T') return '#f87171';
		if (letter === 'G') return '#fb923c';
		if (letter === 'M') return '#FFFF00';
		if (letter === 'L') return '#A1FB7D';
		return '';
	}

	/** Libellé court du niveau (badge) : TG, G, M, L */
	function getLoi0520LevelLabel(val: string | undefined): string {
		const letter = firstLetter0520(val);
		if (letter === 'T') return 'TG';
		if (letter === 'G') return 'G';
		if (letter === 'M') return 'M';
		if (letter === 'L') return 'L';
		return '';
	}

	/** Couleur du texte du badge : blanc sur TG/G (foncé), noir sur M/L (clair) */
	function getLoi0520BadgeTextColor(val: string | undefined): string {
		const letter = firstLetter0520(val);
		return letter === 'M' || letter === 'L' ? '#111827' : '#fff';
	}

	/** Couleur de fond des classes de sensibilité (réf. loi 05.20) : A → rouge, B → orange, C → jaune, D → vert */
	function getSensibiliteClasse0520Bg(classe: string): string {
		const c = (classe || '').trim();
		if (c === 'Classe A') return '#f87171';
		if (c === 'Classe B') return '#fb923c';
		if (c === 'Classe C') return '#FEF08A';
		if (c === 'Classe D') return '#A1FB7D';
		return '';
	}

	function calculerSensibilite(index: number) {
		const row = registreRows[index];
		const niveaux = [row.disponibilite, row.integrite, row.confidentialite];
		// Indices (0-based) selon l'ordre des niveaux dans dicNiveauxRows
		const indices = niveaux
			.map((n) => dicNiveauxRows.findIndex((r) => r.valeur === n))
			.filter((i) => i >= 0);
		if (indices.length === 0) {
			registreRows[index].sensibilite = '';
			return;
		}
		const moyenne = indices.reduce((acc, val) => acc + val, 0) / indices.length;
		const idx = Math.round(moyenne);
		const clamped = Math.max(0, Math.min(idx, dicNiveauxRows.length - 1));
		registreRows[index].sensibilite = dicNiveauxRows[clamped].valeur;
	}

	/** Type d'actif pour une catégorie : depuis Tableau 2 (Catégories d'actifs) Aide-Classification */
	function getTypeActifForCategorie(categorieLibelle: string): string {
		const cat = (categorieLibelle || '').trim();
		const row = categoriesActifsRows.find((r) => (r.libelle || '').trim() === cat);
		return row?.type_actif ? getTypeActifLabel(row.type_actif) : '';
	}

	/** Quand la catégorie de l'actif change : mettre à jour le type depuis Tableau 2 (Catégories d'actifs) */
	function mettreAJourTypeActif(index: number) {
		const cat = (registreRows[index].categorie_actif || '').trim();
		registreRows[index].type_actif = getTypeActifForCategorie(cat) || (cat.toLowerCase() === 'document' || cat.toLowerCase() === 'données' || cat.toLowerCase() === 'donnée' ? 'Actif primaire' : 'Actif support');
	}

	/** Quand le type d'une catégorie est modifié dans Tableau 2 : mettre à jour toutes les lignes du registre ayant cette catégorie */
	function syncRegistreTypeActifPourCategorie(libelleCategorie: string, nouveauType: string) {
		const lib = (libelleCategorie || '').trim();
		const typeNorm = nouveauType === 'Actif primaire' || nouveauType === 'Actif support' ? nouveauType : getTypeActifLabel(nouveauType);
		registreRows.forEach((r) => {
			if ((r.categorie_actif || '').trim() === lib) r.type_actif = typeNorm;
		});
	}

	/** Libellé affiché pour le type d'actif (compatibilité anciennes valeurs Primaire/Secondaire) */
	function getTypeActifLabel(type: string): string {
		const t = (type || '').trim();
		if (t === 'Primaire' || t === 'Actif primaire') return 'Actif primaire';
		if (t === 'Secondaire' || t === 'Actif support') return 'Actif support';
		return t || '—';
	}



	// PTR Table data structure
	let ptrData = [
		{
			id: 1,
			refRisque: '',
			correspISO: '',
			proprietaire: '',
			niveauRisque: '',
			decision: '',
			idPTR: '',
			action: '',
			typeAction: '',
			porteur: '',
			priorite: '',
			periodicite: '',
			complexite: '',
			echeance: '',
			etatAvancement: ''
		}
	];

	/** Couleur de fond (tableau PTR) selon l'état d'avancement : Non démarrée=gris, En cours=bleu, Terminée=vert, En retard=rouge */
	function getPtrEtatAvancementBg(etat: string): string {
		const e = (etat || '').trim();
		if (e === 'Non démarrée') return 'bg-gray-400 text-white';
		if (e === 'En cours') return 'bg-blue-500 text-white';
		if (e === 'Terminée') return 'bg-green-500 text-white';
		if (e === 'En retard') return 'bg-red-500 text-white';
		return 'bg-gray-100 text-gray-700';
	}

	/** Répartition des actions PTR par état d'avancement (pour le graphique circulaire) */
	const ETATS_AVANCEMENT_PTR = ['Non démarrée', 'En cours', 'Terminée', 'En retard'] as const;
	$: ptrAvancementStats = (() => {
		const counts: Record<string, number> = { 'Non démarrée': 0, 'En cours': 0, 'Terminée': 0, 'En retard': 0 };
		for (const row of ptrData) {
			const etat = (row.etatAvancement || '').trim();
			if (ETATS_AVANCEMENT_PTR.includes(etat as (typeof ETATS_AVANCEMENT_PTR)[number])) {
				counts[etat] = (counts[etat] ?? 0) + 1;
			} else if (etat) {
				// Autre valeur non standard : on compte dans "Non démarrée" pour garder 4 segments
				counts['Non démarrée'] += 1;
			} else {
				counts['Non démarrée'] += 1;
			}
		}
		/** Couleurs fixes par état (ECharts utilise itemStyle par slice pour garder le bon ordre) */
		const colorMap: Record<string, string> = {
			'Non démarrée': '#9ca3af',
			'En cours': '#3b82f6',
			'Terminée': '#22c55e',
			'En retard': '#ef4444'
		};
		return ETATS_AVANCEMENT_PTR.map((name) => ({
			name,
			value: counts[name] ?? 0,
			itemStyle: { color: colorMap[name] }
		}));
	})();

	// Function to add a new row
	function addRow() {
		const newRow = {
			id: ptrData.length + 1,
			refRisque: '',
			correspISO: '',
			proprietaire: '',
			niveauRisque: '',
			decision: '',
			idPTR: '',
			action: '',
			typeAction: '',
			porteur: '',
			priorite: '',
			periodicite: '',
			complexite: '',
			echeance: '',
			etatAvancement: ''
		};
		ptrData = [...ptrData, newRow];
	}

	// Function to delete a row
	function deleteRow(index) {
		ptrData = ptrData.filter((_, i) => i !== index);
		// Reindex the IDs
		ptrData = ptrData.map((row, i) => ({ ...row, id: i + 1 }));
	}

	/** Monter la ligne d'un cran (échanger avec la ligne au-dessus) */
	function monterLignePTR(index: number) {
		if (index <= 0 || index >= ptrData.length) return;
		ptrData = ptrData.slice();
		const tmp = ptrData[index];
		ptrData[index] = ptrData[index - 1];
		ptrData[index - 1] = tmp;
		ptrData = ptrData.map((row, i) => ({ ...row, id: i + 1 }));
	}

	/** Descendre la ligne d'un cran (échanger avec la ligne en dessous) */
	function descendreLignePTR(index: number) {
		if (index < 0 || index >= ptrData.length - 1) return;
		ptrData = ptrData.slice();
		const tmp = ptrData[index];
		ptrData[index] = ptrData[index + 1];
		ptrData[index + 1] = tmp;
		ptrData = ptrData.map((row, i) => ({ ...row, id: i + 1 }));
	}

	// Handle cell value changes (reassign to trigger reactivity and persistence)
	function updateCell(index: number, field: string, event: Event) {
		const target = event.target as HTMLInputElement | HTMLTextAreaElement;
		const value = target?.value ?? '';
		ptrData = ptrData.map((row, i) =>
			i === index ? { ...row, [field]: value } : row
		);
	}

	/** Normalise un code risque pour comparaison (trim, majuscules, O→0) */
	function normalizeCodeRisque(code: string): string {
		return (code || '').trim().toUpperCase().replace(/O/g, '0');
	}

	/** Trouve une ligne de la cartographie dont le Code Risque correspond à la REF Risque donnée */
	function findCartoRowByCodeRisque(refRisque: string): CartoRow | undefined {
		const ref = normalizeCodeRisque(refRisque);
		if (!ref) return undefined;
		return cartoRows.find((r) => normalizeCodeRisque(r.codeRisque) === ref);
	}

	/** Niveau du risque net affiché dans la carto (version A ou B) — utilisé pour l’import PTR et les couleurs */
	function getNiveauRisqueNetCarto(carto: CartoRow): string {
		return cartoVersion === 'B' ? getSignificationRisqueNetB(carto) : getNiveauNet(carto);
	}

	/** Remplit les champs de la ligne PTR à partir de la cartographie lorsque la REF Risque correspond à un Code Risque */
	function fillPtrFromCartographie(ptrIndex: number) {
		const row = ptrData[ptrIndex];
		if (!row) return;
		const carto = findCartoRowByCodeRisque(row.refRisque);
		if (!carto) return;
		ptrData = ptrData.map((r, i) =>
			i !== ptrIndex
				? r
				: {
						...r,
						correspISO: carto.mesureISO ?? r.correspISO,
						proprietaire: carto.proprietaireRisque ?? r.proprietaire,
						niveauRisque: getNiveauRisqueNetCarto(carto) || r.niveauRisque,
						decision: carto.decision ?? r.decision,
						action: carto.actionPTR ?? r.action
					}
		);
		saveCustomMethodState();
	}

	/** Construit le tableau PTR à partir de la cartographie : une ligne PTR par ligne de texte dans "Action à mettre en place" (chaque retour à la ligne = une action). */
	function syncPtrFromCartographie() {
		type PtrRow = (typeof ptrData)[number];
		const defaultPtrRow = (id: number): PtrRow => ({
			id,
			refRisque: '',
			correspISO: '',
			proprietaire: '',
			niveauRisque: '',
			decision: '',
			idPTR: '',
			action: '',
			typeAction: '',
			porteur: '',
			priorite: '',
			periodicite: '',
			complexite: '',
			echeance: '',
			etatAvancement: ''
		});

		const newRows: PtrRow[] = [];
		let nextId = 1;

		for (const carto of cartoRows) {
			const text = (carto.actionPTR ?? '').trim();
			const lines = text ? text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0) : [];

			for (const actionLine of lines) {
				const refNorm = normalizeCodeRisque(carto.codeRisque ?? '');
				const existing = ptrData.find(
					(r) => normalizeCodeRisque(r.refRisque) === refNorm && (r.action ?? '').trim() === actionLine
				);
				if (existing) {
					newRows.push({
						...existing,
						id: nextId++,
						refRisque: (carto.codeRisque ?? '').trim(),
						correspISO: (carto.mesureISO ?? existing.correspISO ?? '').toString().replace(/\n/g, ' '),
						proprietaire: (carto.proprietaireRisque ?? existing.proprietaire ?? '').trim(),
						niveauRisque: getNiveauRisqueNetCarto(carto) || existing.niveauRisque || '',
						decision: (carto.decision ?? existing.decision ?? '').trim(),
						action: actionLine
					});
				} else {
					newRows.push({
						...defaultPtrRow(nextId++),
						refRisque: (carto.codeRisque ?? '').trim(),
						correspISO: (carto.mesureISO ?? '').toString().replace(/\n/g, ' '),
						proprietaire: (carto.proprietaireRisque ?? '').trim(),
						niveauRisque: getNiveauRisqueNetCarto(carto) || '',
						decision: (carto.decision ?? '').trim(),
						action: actionLine
					});
				}
			}
		}

		ptrData = newRows.length > 0 ? newRows : [defaultPtrRow(1)];
	}

</script>

<style>
    /* Cellules flexibles en hauteur sur toute la page Custom method : ligne = max des hauteurs des cellules */
    .methode-risque-nearsecure-page table,
    .methode-risque-nearsecure-page table thead,
    .methode-risque-nearsecure-page table tbody,
    .methode-risque-nearsecure-page table tr {
        height: auto !important;
    }
    .methode-risque-nearsecure-page table td,
    .methode-risque-nearsecure-page table th {
        height: auto !important;
        min-height: 0 !important;
        max-height: none !important;
        overflow: visible !important;
        white-space: normal !important;
        word-wrap: break-word;
        overflow-wrap: break-word;
        vertical-align: top;
    }

    /* Registre de classification : cellules flexibles selon le contenu, pas de padding haut/bas */
    .registre-classification-table tbody td {
        vertical-align: top;
    }

    /* Garder min-height 80px pour les textareas du registre (le style global methode-risque-nearsecure-flexible-cells impose 2.5rem sinon) */
    .registre-classification-table tbody td textarea {
        min-height: 80px !important;
    }

    /* Tableau PTR : même mise en page que registre de classification (cellules à champs texte = textarea 80px) */
    .ptr-table tbody td {
        vertical-align: top;
    }
    .ptr-table tbody td textarea {
        min-height: 80px !important;
    }

    /* Section 7 – colonnes Impact Disponibilité / Intégrité / Confidentialité */
    .registre-classification-table th.registre-impact-dic-th {
        min-width: 110px;
        max-width: 130px;
        width: 120px;
        white-space: normal;
        overflow-wrap: break-word;
        font-size: 0.875rem;
        line-height: 1.25;
    }
    .registre-classification-table td.registre-loi0520-cell {
        max-width: 130px;
        width: 120px;
    }
    /* Section 7 – cellules Impact D/I/C : select + meilleure visibilité du choix */
    .registre-classification-table tbody tr .registre-loi0520-cell .registre-loi0520-select {
        min-height: 2.25rem;
        font-size: 0.9375rem;
    }
    .registre-classification-table .registre-loi0520-readout {
        font-size: 0.8125rem;
        line-height: 1.35;
        min-height: 0;
        overflow: visible;
    }

    /* Hide/show table cells (only tbody td/data cells, NOT headers).
       Keep all <thead> cells visible so headers display correctly for each view.
       Columns 4-5 (Description, Code Risque) always stay visible in ALL views.
       Column 46 = Actions (always visible in all views).
       Views: identification (1-20 + 46), brut (21-32 + 46), net (33-38 + 46), ptr (39-45 + 46).
    */

    /* Identification view: plage 21–dernière colonne données masquée (règle détaillée dans cartoViewDynamicCss pour exclure la colonne Actions en mode modification). */

    /* Vues filtrées (brut / net / ptr) : règles dynamiques injectées via cartoViewDynamicCss (svelte:head) pour respecter le nombre variable de colonnes d'impact et afficher la colonne Actions dans toutes les vues */

    /* Keep table layout predictable */
    table {
        table-layout: auto;
    }

    /* Cartographie : lignes et cellules flexibles selon le contenu (hauteur = max des cellules de la ligne) */
    .view-identification tbody td,
    .view-brut tbody td,
    .view-net tbody td,
    .view-ptr tbody td {
        padding: 8px;
        vertical-align: top;
    }

    /* Textarea : hauteur minimale raisonnable, peut grandir avec le contenu */
    .view-identification textarea,
    .view-brut textarea,
    .view-net textarea,
    .view-ptr textarea {
        min-height: 2.5rem;
    }

    /* Version "Avec Efficacité" : en-têtes et cellules affichent tout le contenu (pas de masquage) */
    .carto-b-th {
        box-sizing: border-box;
        line-height: 1.2;
        white-space: normal;
        overflow-wrap: break-word;
    }
    .carto-b-cell {
        box-sizing: border-box;
    }

    /* Modifiable text cells: no visible outline by default, show on hover/focus */
    .methode-risque-nearsecure-page table input:not([type="checkbox"]),
    .methode-risque-nearsecure-page table textarea {
        border: 1px solid transparent !important;
        outline: none !important;
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .methode-risque-nearsecure-page table input:not([type="checkbox"]):hover,
    .methode-risque-nearsecure-page table input:not([type="checkbox"]):focus,
    .methode-risque-nearsecure-page table textarea:hover,
    .methode-risque-nearsecure-page table textarea:focus {
        border-color: #d1d5db !important; /* gray-300 */
        outline: none !important;
    }
    .methode-risque-nearsecure-page table input:not([type="checkbox"]):focus,
    .methode-risque-nearsecure-page table textarea:focus {
        box-shadow: 0 0 0 1px #d1d5db;
    }
    /* Cellules colorées (ex. Définition Tableau 1 Aide-Risque) : pas de bordure/ombre grise pour garder la case entièrement colorée */
    .methode-risque-nearsecure-page table .cell-colored-definition input,
    .methode-risque-nearsecure-page table .cell-colored-definition textarea {
        border-color: transparent !important;
    }
    .methode-risque-nearsecure-page table .cell-colored-definition input:hover,
    .methode-risque-nearsecure-page table .cell-colored-definition input:focus,
    .methode-risque-nearsecure-page table .cell-colored-definition textarea:hover,
    .methode-risque-nearsecure-page table .cell-colored-definition textarea:focus {
        border-color: transparent !important;
        box-shadow: none !important;
    }
    /* Sections Aide-Risque / Échelle PTR en affichage seul : champs non modifiables */
    .readonly-scales-section input,
    .readonly-scales-section textarea,
    .readonly-scales-section select {
        pointer-events: none !important;
        background: #f3f4f6 !important;
        cursor: default;
    }
    /* En lecture seule, les inputs des cellules colorées gardent le fond de la cellule (transparent) */
    .readonly-scales-section .cell-colored-definition input,
    .readonly-scales-section .cell-colored-definition textarea {
        background: transparent !important;
    }
    /* Colonnes qui doivent rester 100 % blanches (Échelle, Fréquence, etc.) : fond blanc forcé en lecture seule */
    .readonly-scales-section .cell-bg-white,
    .readonly-scales-section .cell-bg-white input,
    .readonly-scales-section .cell-bg-white textarea {
        background: #ffffff !important;
    }
    /* Matrice 3.2 en mode affichage : cellules 1, 2, 3… fond 100 % couleur (intervalles 3.1), valeur numérique uniquement */
    .readonly-scales-section .cell-colored-matrice input {
        border-color: transparent !important;
        background: transparent !important;
    }
    .readonly-scales-section .cell-colored-matrice input:hover,
    .readonly-scales-section .cell-colored-matrice input:focus {
        border-color: transparent !important;
        box-shadow: none !important;
        background: transparent !important;
    }
</style>

<svelte:head>
	{@html `<style id="carto-dynamic-view-style">${cartoViewDynamicCss}</style>`}
	{@html `<style id="methode-risque-nearsecure-flexible-cells">.methode-risque-nearsecure-page table,.methode-risque-nearsecure-page table thead,.methode-risque-nearsecure-page table tbody,.methode-risque-nearsecure-page table tr{height:auto!important}.methode-risque-nearsecure-page table td,.methode-risque-nearsecure-page table th{height:auto!important;min-height:0!important;max-height:none!important;overflow:visible!important;white-space:normal!important;word-wrap:break-word;overflow-wrap:break-word;vertical-align:top}.methode-risque-nearsecure-page table textarea{min-height:2.5rem;overflow-y:hidden;resize:none}</style>`}
</svelte:head>

<main class="methode-risque-nearsecure-page p-6 space-y-8 overflow-visible" use:autoResizeTextareas>
	<section class="space-y-2">
		<div class="flex flex-wrap items-center justify-between gap-4">
			<h1 class="text-2xl font-bold text-gray-900">La méthode NearSecure</h1>
			<div class="flex flex-wrap items-center gap-2">
				<!-- Sélecteur de projet : mêmes tableaux/échelles, données par projet -->
				<div class="flex flex-wrap items-center gap-2 mr-2 border-r border-gray-200 pr-4">
					<label for="project-select" class="text-sm font-medium text-gray-700">Projet :</label>
					<select
						id="project-select"
						value={activeProjectId}
						on:change={(e) => switchToProject((e.currentTarget as HTMLSelectElement).value)}
						class="min-w-[180px] text-sm rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-800 focus:border-sky-500 focus:ring-sky-500"
					>
						{#each Object.entries(projects).length ? Object.entries(projects) : [[activeProjectId, { name: 'Projet par défaut' }]] as [id, proj]}
							<option value={id}>{proj.name}</option>
						{/each}
					</select>
					<button
						type="button"
						class="px-3 py-2 text-sm font-medium rounded-lg border border-sky-600 text-sky-600 bg-white hover:bg-sky-50 transition-colors"
						on:click={addNewProject}
						title="Créer un nouveau projet (mêmes tableaux et échelles)"
					>
						Nouveau projet
					</button>
					<button
						type="button"
						class="px-2 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
						title="Renommer le projet"
						on:click={() => {
							const proj = projects[activeProjectId];
							if (!proj) return;
							const n = prompt('Nom du projet :', proj.name);
							if (n != null && n.trim()) renameProject(activeProjectId, n.trim());
						}}
					>
						<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
					</button>
					<button
						type="button"
						class="px-2 py-2 text-sm rounded-lg border border-gray-300 bg-white text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
						title="Supprimer le projet (au moins un doit rester)"
						disabled={Object.keys(projects).length <= 1}
						on:click={() => {
							if (Object.keys(projects).length <= 1) return;
							if (confirm('Supprimer ce projet ? Les données du projet seront perdues.')) deleteProject(activeProjectId);
						}}
					>
						<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
					</button>
				</div>
				<button
					type="button"
					class="px-3 py-2 text-sm font-medium rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition-colors flex items-center gap-2"
					on:click={saveWithFeedback}
					title="Sauvegarder maintenant (local + serveur si disponible)"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
					</svg>
					{saveFeedback === 'saved' ? 'Sauvegardé ✓' : 'Sauvegarder'}
				</button>
				<button
					type="button"
					class="px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center gap-2"
					on:click={() => (showExportExcelModal = true)}
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
					Télécharger en Excel
				</button>
				<!-- Backup JSON masqué
				<button
					type="button"
					class="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
					on:click={downloadBackupJson}
					title="Télécharger une copie de sauvegarde (JSON) à conserver hors du navigateur"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
					</svg>
					Backup JSON
				</button>
				-->
				<!-- Restaurer la version précédente masqué
				<button
					type="button"
					class="px-3 py-2 text-sm font-medium rounded-lg border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
					on:click={restorePreviousVersion}
					disabled={!hasPreviousVersion}
					title={hasPreviousVersion ? 'Revenir à l’état avant la dernière sauvegarde' : 'Aucune version précédente (effectuez au moins une sauvegarde)'}
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
					</svg>
					{saveFeedback === 'restored' ? 'Restauré ✓' : 'Restaurer la version précédente'}
				</button>
				-->
			</div>
		</div>
		<div class="flex flex-wrap items-center gap-4 text-sm text-gray-500">
			{#if lastSavedAt}
				<span class="tabular-nums">Dernière sauvegarde : {formatLastSaved(lastSavedAt)}</span>
			{:else}
				<span>Sauvegarde automatique (local + serveur)</span>
			{/if}
		</div>
		<p class="text-gray-600 max-w-3xl">
			Cette page regroupe les éléments de La méthode NearSecure (contrôle du document, registre de classification, aides, cartographie des risques, PTR et échelle PTR).  Les sections ci-dessous ne modifient pas le moteur de scoring standard de CISO Assistant, mais servent de guide pour la méthode NearSecure.
		</p>
	</section>

	<!-- Modale de sélection des feuilles/vues pour l'export Excel -->
	{#if showExportExcelModal}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
			role="dialog"
			aria-modal="true"
			aria-labelledby="export-excel-modal-title"
			on:click|self={() => (showExportExcelModal = false)}
			on:keydown={(e) => e.key === 'Escape' && (showExportExcelModal = false)}
		>
			<div
				class="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
				on:click|stopPropagation
				on:keydown|stopPropagation
			>
				<h2 id="export-excel-modal-title" class="text-lg font-semibold text-gray-900 mb-2">Choisir les éléments à exporter</h2>
				<p class="text-sm text-gray-600 mb-4">Cochez les feuilles (ou vues) à inclure dans le fichier Excel.</p>
				<div class="space-y-2 mb-4 max-h-64 overflow-y-auto">
					{#each EXPORT_EXCEL_SHEET_IDS as sheetId}
						<label class="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded px-2 py-1.5">
							<input type="checkbox" bind:checked={exportExcelSheets[sheetId]} class="rounded border-gray-300 text-sky-600" />
							<span class="text-sm text-gray-800">{EXPORT_EXCEL_SHEET_LABELS[sheetId]}</span>
						</label>
					{/each}
				</div>
				{#if exportExcelSheets['cartographie-risques']}
					<div class="mb-4 pl-6 border-l-2 border-sky-200">
						<label for="export-carto-view" class="block text-sm font-medium text-gray-700 mb-1">Vue Cartographie des risques</label>
						<select
							id="export-carto-view"
							bind:value={exportCartoView}
							class="w-full text-sm rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-800 focus:border-sky-500 focus:ring-sky-500"
						>
{#each ['all', 'identification', 'brut', 'net', 'ptr'] as viewId}
									<option value={viewId}>{EXPORT_CARTO_VIEW_LABELS[viewId]}</option>
								{/each}
						</select>
					</div>
				{/if}
				<div class="flex flex-wrap gap-2 mb-4">
					<button type="button" class="text-sm text-sky-600 hover:underline" on:click={() => setAllExportSheets(true)}>Tout sélectionner</button>
					<span class="text-gray-300">|</span>
					<button type="button" class="text-sm text-sky-600 hover:underline" on:click={() => setAllExportSheets(false)}>Tout désélectionner</button>
				</div>
				<div class="flex justify-end gap-2">
					<button
						type="button"
						class="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
						on:click={() => (showExportExcelModal = false)}
					>
						Annuler
					</button>
					<button
						type="button"
						class="px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
						disabled={!EXPORT_EXCEL_SHEET_IDS.some((id) => exportExcelSheets[id])}
						on:click={async () => {
							await exportToExcel();
							showExportExcelModal = false;
						}}
					>
						Exporter
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Navigation entre les 7 sous-parties -->
	<nav class="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
		<button
			type="button"
			class={`px-3 py-1.5 text-sm rounded-md border ${
				activeSection === 'controle-document'
					? 'bg-sky-600 text-white border-sky-600'
					: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
			}`}
			on:click={() => (activeSection = 'controle-document')}
		>
			Contrôle du document
		</button>
		<button
			type="button"
			class={`px-3 py-1.5 text-sm rounded-md border ${
				activeSection === 'registre-classification'
					? 'bg-sky-600 text-white border-sky-600'
					: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
			}`}
			on:click={() => (activeSection = 'registre-classification')}
		>
			Registre de classification
		</button>
		<button
			type="button"
			class={`px-3 py-1.5 text-sm rounded-md border ${
				activeSection === 'aide-classification'
					? 'bg-sky-600 text-white border-sky-600'
					: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
			}`}
			on:click={() => (activeSection = 'aide-classification')}
		>
			Aide-Classification
		</button>
		<button
			type="button"
			class={`px-3 py-1.5 text-sm rounded-md border ${
				activeSection === 'cartographie-risques'
					? 'bg-sky-600 text-white border-sky-600'
					: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
			}`}
			on:click={() => (activeSection = 'cartographie-risques')}
		>
			Cartographie des risques
		</button>
		<button
			type="button"
			class={`px-3 py-1.5 text-sm rounded-md border ${
				activeSection === 'aide-risque'
					? 'bg-sky-600 text-white border-sky-600'
					: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
			}`}
			on:click={() => (activeSection = 'aide-risque')}
		>
			Aide-Risque
		</button>
		<button
			type="button"
			class={`px-3 py-1.5 text-sm rounded-md border ${
				activeSection === 'synthese'
					? 'bg-sky-600 text-white border-sky-600'
					: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
			}`}
			on:click={() => (activeSection = 'synthese')}
		>
			Synthèse
		</button>
		<button
			type="button"
			class={`px-3 py-1.5 text-sm rounded-md border ${
				activeSection === 'ptr'
					? 'bg-sky-600 text-white border-sky-600'
					: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
			}`}
			on:click={() => (activeSection = 'ptr')}
		>
			PTR
		</button>
		<button
			type="button"
			class={`px-3 py-1.5 text-sm rounded-md border ${
				activeSection === 'echelle-ptr'
					? 'bg-sky-600 text-white border-sky-600'
					: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
			}`}
			on:click={() => (activeSection = 'echelle-ptr')}
		>
			Échelle-PTR
		</button>
		<button
			type="button"
			class={`px-3 py-1.5 text-sm rounded-md border ${
				activeSection === 'parametrage'
					? 'bg-sky-600 text-white border-sky-600'
					: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
			}`}
			on:click={() => (activeSection = 'parametrage')}
			title="Modifier l'aide classification, l'aide risque et l'échelle PTR pour ce projet"
		>
			Paramétrage
		</button>
	</nav>

	<!-- Contenu : 7 sous-parties -->

	{#if activeSection === 'controle-document'}
		<section class="space-y-8">
			<div class="flex items-center justify-between gap-4 flex-wrap">
				<h2 class="text-xl font-semibold text-gray-900">Contrôle du document</h2>
				<button
					type="button"
					class="px-3 py-1.5 text-sm rounded {editModeControleDocument
						? 'bg-gray-600 text-white hover:bg-gray-700'
						: 'bg-sky-600 text-white hover:bg-sky-700'}"
					on:click={() => {
						editModeControleDocument = !editModeControleDocument;
						if (!editModeControleDocument) saveCustomMethodState();
					}}
				>
					{editModeControleDocument ? 'Terminer la modification' : 'Modifier'}
				</button>
			</div>
			

			<!-- Tableau 1: Rédaction du document -->
			<section class="space-y-3">
				<h3 class="text-lg font-semibold text-gray-900">1. Rédaction du document</h3>
				<div class="overflow-hidden rounded-lg border border-gray-700 bg-white shadow-sm">
					<table class="min-w-full text-sm border-collapse border border-gray-700">
						<thead>
							<tr>
								<th colspan={editModeControleDocument ? 5 : 4} class="px-4 py-3 text-left font-semibold text-white bg-slate-900 border border-gray-700">
									RÉDACTION DU DOCUMENT
								</th>
							</tr>
							<tr>
								<th class="px-4 py-2 text-left font-semibold text-white bg-gray-600 border border-gray-700 w-32">Rôle</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-gray-600 border border-gray-700">Nom</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-gray-600 border border-gray-700">Fonction</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-gray-600 border border-gray-700">Date</th>
								{#if editModeControleDocument}
									<th class="px-4 py-2 text-left font-semibold text-white bg-gray-600 border border-gray-700">Actions</th>
								{/if}
							</tr>
						</thead>
						<tbody>
							{#each redactionRows as row, i}
								<tr class="border border-gray-700">
									<td class="px-4 py-2 font-semibold text-white bg-gray-600 border border-gray-700">
										<input
											class="w-full border border-transparent bg-transparent text-white placeholder-white/70 rounded px-2 py-1 text-sm font-semibold"
											type="text"
											bind:value={redactionRows[i].role}
											on:blur={() => saveCustomMethodState()}
											placeholder="Ex. Écrit par :"
										/>
									</td>
									<td class="px-4 py-2 text-black border border-gray-700 bg-white">
										<input
											class="w-full border border-gray-300 rounded px-2 py-1 text-sm"
											type="text"
											bind:value={redactionRows[i].nom}
											on:blur={() => saveCustomMethodState()}
										/>
									</td>
									<td class="px-4 py-2 text-black border border-gray-700 bg-white">
										<input
											class="w-full border border-gray-300 rounded px-2 py-1 text-sm"
											type="text"
											bind:value={redactionRows[i].fonction}
											on:blur={() => saveCustomMethodState()}
										/>
									</td>
									<td class="px-4 py-2 text-black border border-gray-700 bg-white">
										<input
											class="w-full border border-gray-300 rounded px-2 py-1 text-sm"
											type="text"
											bind:value={redactionRows[i].date}
											on:blur={() => saveCustomMethodState()}
										/>
									</td>
									{#if editModeControleDocument}
										<td class="px-4 py-2 border border-gray-700 bg-gray-100">
											<div class="flex gap-1">
												<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererLigneRedactionAvant(i)} title="Ajouter avant">↑+</button>
												<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererLigneRedactionApres(i)} title="Ajouter après">↓+</button>
												<button type="button" class="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerLigneRedaction(i)} title="Supprimer">✕</button>
											</div>
										</td>
									{/if}
								</tr>
							{/each}
						</tbody>
					</table>
					</div>
					{#if editModeControleDocument}
						<div class="flex gap-2 mt-2">
							<button type="button" class="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700" on:click={ajouterLigneRedaction}>+ Ajouter une ligne</button>
							{#if redactionRows.length > 1}
								<button type="button" class="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerLigneRedaction(redactionRows.length - 1)}>- Supprimer la dernière ligne</button>
							{/if}
						</div>
					{/if}
			</section>

			<!-- Tableau 2: Diffusion du document -->
			<section class="space-y-3">
				<h3 class="text-lg font-semibold text-gray-900">2. Diffusion du document</h3>
				<div class="overflow-hidden rounded-lg border border-gray-700 bg-white shadow-sm">
					<table class="min-w-full text-sm border-collapse border border-gray-700">
						<thead>
							<tr>
								<th colspan={editModeControleDocument ? 4 : 3} class="px-4 py-3 text-left font-semibold text-white bg-slate-900 border border-gray-700">
									DIFFUSION DU DOCUMENT
								</th>
							</tr>
							<tr>
								<th class="px-4 py-2 text-left font-semibold text-white bg-gray-600 border border-gray-700">Nom</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-gray-600 border border-gray-700">Entité / Fonction</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-gray-600 border border-gray-700">Date</th>
								{#if editModeControleDocument}
									<th class="px-4 py-2 text-left font-semibold text-white bg-gray-600 border border-gray-700">Actions</th>
								{/if}
							</tr>
						</thead>
						<tbody>
							{#each diffusionRows as row, i}
								<tr class="border border-gray-700">
									<td class="px-4 py-2 text-black border border-gray-700 bg-white">
										<input
											class="w-full border border-gray-300 rounded px-2 py-1 text-sm"
											type="text"
											bind:value={diffusionRows[i].nom}
											on:blur={() => saveCustomMethodState()}
										/>
									</td>
									<td class="px-4 py-2 text-black border border-gray-700 bg-white">
										<input
											class="w-full border border-gray-300 rounded px-2 py-1 text-sm"
											type="text"
											bind:value={diffusionRows[i].entite_fonction}
											on:blur={() => saveCustomMethodState()}
										/>
									</td>
									<td class="px-4 py-2 text-black border border-gray-700 bg-white">
										<input
											class="w-full border border-gray-300 rounded px-2 py-1 text-sm"
											type="text"
											bind:value={diffusionRows[i].date}
											on:blur={() => saveCustomMethodState()}
										/>
									</td>
									{#if editModeControleDocument}
										<td class="px-4 py-2 border border-gray-700 bg-gray-100">
											<div class="flex gap-1">
												<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererLigneDiffusionAvant(i)} title="Ajouter avant">↑+</button>
												<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererLigneDiffusionApres(i)} title="Ajouter après">↓+</button>
												<button type="button" class="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerLigneDiffusion(i)} title="Supprimer">✕</button>
											</div>
										</td>
									{/if}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				{#if editModeControleDocument}
					<div class="flex gap-2 mt-2">
						<button type="button" class="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700" on:click={ajouterLigneDiffusion}>+ Ajouter une ligne</button>
						{#if diffusionRows.length > 1}
							<button type="button" class="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerLigneDiffusion(diffusionRows.length - 1)}>- Supprimer la dernière ligne</button>
						{/if}
					</div>
				{/if}
			</section>

			<!-- Tableau 3: Contrôle des versions -->
			<section class="space-y-3">
				<h3 class="text-lg font-semibold text-gray-900">3. Contrôle des versions du document</h3>
				<div class="overflow-hidden rounded-lg border border-gray-700 bg-white shadow-sm">
					<table class="min-w-full text-sm border-collapse border border-gray-700">
						<thead>
							<tr>
								<th colspan={editModeControleDocument ? 4 : 3} class="px-4 py-3 text-left font-semibold text-white bg-slate-900 border border-gray-700">
									CONTRÔLE DES VERSIONS DU DOCUMENT
								</th>
							</tr>
							<tr>
								<th class="px-4 py-2 text-left font-semibold text-white bg-gray-600 border border-gray-700">Version</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-gray-600 border border-gray-700">Date</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-gray-600 border border-gray-700">Modification</th>
								{#if editModeControleDocument}
									<th class="px-4 py-2 text-left font-semibold text-white bg-gray-600 border border-gray-700">Actions</th>
								{/if}
							</tr>
						</thead>
						<tbody>
							{#each versionRows as row, i}
								<tr class="border border-gray-700">
									<td class="px-4 py-2 text-black border border-gray-700 bg-white">
										<input
											class="w-full border border-gray-300 rounded px-2 py-1 text-sm"
											type="text"
											bind:value={versionRows[i].version}
											on:blur={() => saveCustomMethodState()}
										/>
									</td>
									<td class="px-4 py-2 text-black border border-gray-700 bg-white">
										<input
											class="w-full border border-gray-300 rounded px-2 py-1 text-sm"
											type="text"
											bind:value={versionRows[i].date}
											on:blur={() => saveCustomMethodState()}
										/>
									</td>
									<td class="px-4 py-2 text-black border border-gray-700 bg-white">
										<input
											class="w-full border border-gray-300 rounded px-2 py-1 text-sm"
											type="text"
											bind:value={versionRows[i].modification}
											on:blur={() => saveCustomMethodState()}
										/>
									</td>
									{#if editModeControleDocument}
										<td class="px-4 py-2 border border-gray-700 bg-gray-100">
											<div class="flex gap-1">
												<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererLigneVersionAvant(i)} title="Ajouter avant">↑+</button>
												<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererLigneVersionApres(i)} title="Ajouter après">↓+</button>
												<button type="button" class="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerLigneVersion(i)} title="Supprimer">✕</button>
											</div>
										</td>
									{/if}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				{#if editModeControleDocument}
					<div class="flex gap-2 mt-2">
						<button type="button" class="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700" on:click={ajouterLigneVersion}>+ Ajouter une ligne</button>
						{#if versionRows.length > 1}
							<button type="button" class="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerLigneVersion(versionRows.length - 1)}>- Supprimer la dernière ligne</button>
						{/if}
					</div>
				{/if}
			</section>
		</section>
	{:else if activeSection === 'registre-classification'}
		<section class="space-y-6">
			<div class="flex items-center justify-between gap-4 flex-wrap">
				<h2 class="text-xl font-semibold text-gray-900">Registre de classification des actifs informationnels</h2>
				<div class="flex gap-2 items-center flex-wrap">
					<button
						type="button"
						class="px-3 py-1.5 text-sm rounded border {showRegistreLoi0520
							? 'bg-amber-600 text-white border-amber-600'
							: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}"
						on:click={() => { showRegistreLoi0520 = true; saveCustomMethodState(); }}
						title="Afficher la section 7 – Classification selon la loi n° 05.20"
					>
						Avec classification loi 05-20
					</button>
					<button
						type="button"
						class="px-3 py-1.5 text-sm rounded border {!showRegistreLoi0520
							? 'bg-sky-600 text-white border-sky-600'
							: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}"
						on:click={() => { showRegistreLoi0520 = false; saveCustomMethodState(); }}
						title="Masquer la section 7"
					>
						Sans classification loi 05-20
					</button>
					<button
						type="button"
						class="px-3 py-1.5 text-sm rounded {editModeRegistre
							? 'bg-gray-600 text-white hover:bg-gray-700'
							: 'bg-sky-600 text-white hover:bg-sky-700'}"
						on:click={() => (editModeRegistre = !editModeRegistre)}
					>
						{editModeRegistre ? 'Terminer la modification' : 'Modifier'}
					</button>
				</div>
			</div>
			
			<p class="text-gray-700">
				Ligne de saisie pour le registre de classification des actifs informationnels.
			</p>

			{#if editModeRegistre}
			<!-- Boutons pour ajouter/supprimer des lignes -->
			<div class="flex gap-2">
				<button
					type="button"
					class="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700"
					on:click={ajouterLigneRegistre}
				>
					+ Ajouter une ligne
				</button>
				{#if registreRows.length > 1}
					<button
						type="button"
						class="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700"
						on:click={() => supprimerLigneRegistre(registreRows.length - 1)}
					>
						- Supprimer la dernière ligne
					</button>
				{/if}
			</div>
			{/if}

			<!-- Tableau principal du registre -->
			<div class="overflow-x-auto rounded-lg border border-black bg-white shadow-sm">
				<table class="registre-classification-table min-w-full text-xs border-collapse border border-black">
					<thead>
						<!-- Ligne des titres principaux (1 à 6) -->
						<tr>
							<th rowspan="2" class="px-2 py-2 text-center font-semibold text-black bg-yellow-400 border border-black min-w-[50px]">
								ID
							</th>
							<th class="px-2 py-2 text-center font-semibold text-black bg-yellow-400 border border-black min-w-[150px]">
								1 – Identification du processus métier
							</th>
							<th class="px-2 py-2 text-center font-semibold text-black bg-yellow-400 border border-black min-w-[150px]">
								2 – Identification de l'activité / Sous‑processus
							</th>
							<th colspan="2" class="px-2 py-2 text-center font-semibold text-black bg-yellow-400 border border-black">
								3 - Identification des actifs et leurs catégorie
							</th>
							<th colspan="2" class="px-2 py-2 text-center font-semibold text-black bg-yellow-400 border border-black">
								4 - Identification du type d'actif
							</th>
							<th class="px-2 py-2 text-center font-semibold text-black bg-yellow-400 border border-black min-w-[120px]">
								5 - Identification du propriétaire de l'actif
							</th>
							<th colspan="4" class="px-2 py-2 text-center font-semibold text-black bg-yellow-400 border border-black">
								6 - Classification des actifs sur la base d'une échelle d'impacts fixée
							</th>
							{#if showRegistreLoi0520}
							<th colspan="5" class="px-2 py-2 text-center font-semibold text-black bg-amber-500 border border-black">
								7 – Classification selon la loi n° 05.20
							</th>
							{/if}
							<th rowspan="2" class="px-2 py-2 text-center font-semibold text-white bg-blue-400 border border-black min-w-[150px]">
								Commentaire
							</th>
							{#if editModeRegistre}
							<th rowspan="2" class="px-2 py-2 text-center font-semibold text-black bg-yellow-300 border border-black min-w-[90px]">
								Actions
							</th>
							{/if}
						</tr>
						<!-- Ligne des sous-titres -->
						<tr>
							<th class="px-2 py-2 text-center font-semibold text-black bg-yellow-300 border border-black min-w-[150px]">
								Processus métier
							</th>
							<th class="px-2 py-2 text-center font-semibold text-black bg-yellow-300 border border-black min-w-[150px]">
								Activité/Sous‑processus
							</th>
							<th class="px-2 py-2 text-center font-semibold text-black bg-yellow-300 border border-black min-w-[150px]">
								Désignation de l'actif informationnel
							</th>
							<th class="px-2 py-2 text-center font-semibold text-black bg-yellow-300 border border-black min-w-[150px]">
								Description de l'actif
							</th>
							<th class="px-2 py-2 text-center font-semibold text-black bg-yellow-300 border border-black min-w-[120px]">
								Catégorie de l'actif
							</th>
							<th class="px-2 py-2 text-center font-semibold text-black bg-yellow-300 border border-black min-w-[120px]">
								Type de l'actif
							</th>
							<th class="px-2 py-2 text-center font-semibold text-black bg-yellow-300 border border-black min-w-[120px]">
								Propriétaire de l'actif
							</th>
							<th class="px-2 py-2 text-center font-semibold text-black bg-yellow-300 border border-black min-w-[100px]">
								Besoin en terme de Disponibilité
							</th>
							<th class="px-2 py-2 text-center font-semibold text-black bg-yellow-300 border border-black min-w-[100px]">
								Besoin en terme d'Intégrité
							</th>
							<th class="px-2 py-2 text-center font-semibold text-black bg-yellow-300 border border-black min-w-[100px]">
								Besoin en terme de Confidentialité
							</th>
							<th class="px-2 py-2 text-center font-semibold text-black bg-yellow-300 border border-black min-w-[100px]">
								Sensibilité de l'actif
							</th>
							{#if showRegistreLoi0520}
							<th class="px-2 py-2 text-center font-semibold text-black bg-amber-200 border border-black registre-impact-dic-th">Impact Disponibilité</th>
							<th class="px-2 py-2 text-center font-semibold text-black bg-amber-200 border border-black registre-impact-dic-th">Impact Intégrité</th>
							<th class="px-2 py-2 text-center font-semibold text-black bg-amber-200 border border-black registre-impact-dic-th">Impact Confidentialité</th>
							<th class="px-2 py-2 text-center font-semibold text-black bg-amber-200 border border-black min-w-[90px]">Sensibilité (réf. loi 05.20)</th>
							<th class="px-2 py-2 text-center font-semibold text-black bg-amber-200 border border-black min-w-[100px]">Confidentialité (décret 05-20)</th>
							{/if}
						</tr>
					</thead>
					<tbody>
						{#each registreRows as row, i}
							<tr class="border border-black">
								<!-- ID – même mise en page que les autres colonnes (textarea 80px) -->
								<td class="px-2 py-1 text-center border border-black bg-white min-h-[80px]">
									<textarea
										class="w-full text-center border border-gray-300 rounded px-1 py-0.5 text-xs min-h-[80px] resize-y"
										bind:value={registreRows[i].id}
										on:blur={() => saveCustomMethodState()}
									></textarea>
								</td>
								<!-- Processus métier – textarea comme Description de l'actif (input ignore min-height dans beaucoup de navigateurs) -->
								<td class="px-2 py-1 border border-black bg-white min-h-[80px]">
									<textarea
										class="w-full border border-gray-300 rounded px-1 py-0.5 text-xs min-h-[80px] resize-y"
										bind:value={registreRows[i].processus_metier}
										on:blur={() => saveCustomMethodState()}
										placeholder="Processus métier"
									></textarea>
								</td>
								<!-- Activité/Sous-processus -->
								<td class="px-2 py-1 border border-black bg-white min-h-[80px]">
									<textarea
										class="w-full border border-gray-300 rounded px-1 py-0.5 text-xs min-h-[80px] resize-y"
										bind:value={registreRows[i].activite_sous_processus}
										on:blur={() => saveCustomMethodState()}
										placeholder="Activité/Sous-processus"
									></textarea>
								</td>
								<!-- Désignation de l'actif -->
								<td class="px-2 py-1 border border-black bg-white min-h-[80px]">
									<textarea
										class="w-full border border-gray-300 rounded px-1 py-0.5 text-xs min-h-[80px] resize-y"
										bind:value={registreRows[i].designation_actif}
										on:blur={() => saveCustomMethodState()}
										placeholder="Désignation de l'actif"
									></textarea>
								</td>
								<!-- Description de l'actif -->
								<td class="px-2 py-1 border border-black bg-white min-h-[80px]">
									<textarea
										class="w-full border border-gray-300 rounded px-1 py-0.5 text-xs min-h-[80px] resize-y"
										bind:value={registreRows[i].description_actif}
										on:blur={() => saveCustomMethodState()}
										placeholder="Description de l'actif..."
									></textarea>
								</td>
								<!-- Catégorie de l'actif – options issues du Tableau 2 (Catégories d'actifs) Aide-Classification -->
								<td class="px-2 py-1 border border-black bg-white">
									<select
										class="w-full border border-gray-300 rounded px-1 py-0.5 text-xs"
										bind:value={registreRows[i].categorie_actif}
										on:change={() => { mettreAJourTypeActif(i); saveCustomMethodState(); }}
									>
										<option value="">--</option>
										{#each categoriesActifsRows as cat}
											<option value={cat.libelle}>{cat.libelle || '(vide)'}</option>
										{/each}
									</select>
								</td>
								<!-- Type de l'actif (depuis Tableau 2 – mis à jour automatiquement quand la catégorie ou le type dans Tableau 2 change) -->
								<td class="px-2 py-1 border border-black bg-gray-50 text-xs">
									{getTypeActifLabel(registreRows[i].type_actif)}
								</td>
								<!-- Propriétaire de l'actif (Section 5) – textarea comme Description de l'actif -->
								<td class="px-2 py-1 border border-black bg-white min-h-[80px]">
									<textarea
										class="w-full border border-gray-300 rounded px-1 py-0.5 text-xs min-h-[80px] resize-y"
										bind:value={registreRows[i].proprietaire_actif}
										on:blur={() => saveCustomMethodState()}
										placeholder="Nom du propriétaire"
									></textarea>
								</td>
								<!-- Disponibilité (Section 6) – options issues du Tableau 1.2 Aide-Classification -->
								<td class={`px-2 py-1 border border-black ${getNiveauBesoinBg(row.disponibilite)}`}>
									<select
										class="w-full border border-gray-300 rounded px-1 py-0.5 text-xs bg-transparent"
										bind:value={registreRows[i].disponibilite}
										on:change={() => { calculerSensibilite(i); recalcCartoImpactDICForRegistreCategory(registreRows[i].categorie_actif); saveCustomMethodState(); }}
									>
										<option value="">--</option>
										{#each dicNiveauxRows as niv}
											<option value={niv.valeur}>{niv.valeur}</option>
										{/each}
									</select>
								</td>
								<!-- Intégrité (Section 6) – options issues du Tableau 1.2 Aide-Classification -->
								<td class={`px-2 py-1 border border-black ${getNiveauBesoinBg(row.integrite)}`}>
									<select
										class="w-full border border-gray-300 rounded px-1 py-0.5 text-xs bg-transparent"
										bind:value={registreRows[i].integrite}
										on:change={() => { calculerSensibilite(i); recalcCartoImpactDICForRegistreCategory(registreRows[i].categorie_actif); saveCustomMethodState(); }}
									>
										<option value="">--</option>
										{#each dicNiveauxRows as niv}
											<option value={niv.valeur}>{niv.valeur}</option>
										{/each}
									</select>
								</td>
								<!-- Confidentialité (Section 6) – options issues du Tableau 1.2 Aide-Classification -->
								<td class={`px-2 py-1 border border-black ${getNiveauBesoinBg(row.confidentialite)}`}>
									<select
										class="w-full border border-gray-300 rounded px-1 py-0.5 text-xs bg-transparent"
										bind:value={registreRows[i].confidentialite}
										on:change={() => { calculerSensibilite(i); recalcCartoImpactDICForRegistreCategory(registreRows[i].categorie_actif); saveCustomMethodState(); }}
									>
										<option value="">--</option>
										{#each dicNiveauxRows as niv}
											<option value={niv.valeur}>{niv.valeur}</option>
										{/each}
									</select>
								</td>
								<!-- Sensibilité de l'actif (Section 6 - Calculée automatiquement comme moyenne de D/I/C) -->
								<td class={`px-2 py-1 text-center border border-black ${getNiveauBesoinBg(row.sensibilite)}`}>
									<span class="text-xs font-semibold">{row.sensibilite || '--'}</span>
								</td>
								{#if showRegistreLoi0520}
								<!-- Section 7 – Impact Disponibilité (loi 05.20) -->
								<td class="px-2 py-1.5 border border-black registre-loi0520-cell align-top" style="background-color: {getLoi0520ImpactBg(row.impactDispo0520) || '#fafafa'};">
									<div class="flex items-center gap-2 flex-wrap">
										{#if row.impactDispo0520}
											<span class="registre-loi0520-badge shrink-0 px-2 py-0.5 rounded text-xs font-bold shadow-sm" style="background-color: {getLoi0520ImpactBg(row.impactDispo0520)}; color: {getLoi0520BadgeTextColor(row.impactDispo0520)};">{getLoi0520LevelLabel(row.impactDispo0520)}</span>
										{/if}
										<select
											class="registre-loi0520-select flex-1 min-w-0 border border-gray-300 rounded px-2 py-1 bg-white/90 text-sm"
											title={row.impactDispo0520 || ''}
											bind:value={registreRows[i].impactDispo0520}
											on:change={() => saveCustomMethodState()}
										>
											<option value="">Choisir…</option>
											{#each REGISTRE_LOI0520_OPTIONS as opt}
												<option value={opt}>{opt}</option>
											{/each}
										</select>
									</div>
								</td>
								<!-- Section 7 – Impact Intégrité (loi 05.20) -->
								<td class="px-2 py-1.5 border border-black registre-loi0520-cell align-top" style="background-color: {getLoi0520ImpactBg(row.impactIntegrite0520) || '#fafafa'};">
									<div class="flex items-center gap-2 flex-wrap">
										{#if row.impactIntegrite0520}
											<span class="registre-loi0520-badge shrink-0 px-2 py-0.5 rounded text-xs font-bold shadow-sm" style="background-color: {getLoi0520ImpactBg(row.impactIntegrite0520)}; color: {getLoi0520BadgeTextColor(row.impactIntegrite0520)};">{getLoi0520LevelLabel(row.impactIntegrite0520)}</span>
										{/if}
										<select
											class="registre-loi0520-select flex-1 min-w-0 border border-gray-300 rounded px-2 py-1 bg-white/90 text-sm"
											title={row.impactIntegrite0520 || ''}
											bind:value={registreRows[i].impactIntegrite0520}
											on:change={() => saveCustomMethodState()}
										>
											<option value="">Choisir…</option>
											{#each REGISTRE_LOI0520_OPTIONS as opt}
												<option value={opt}>{opt}</option>
											{/each}
										</select>
									</div>
								</td>
								<!-- Section 7 – Impact Confidentialité (loi 05.20) -->
								<td class="px-2 py-1.5 border border-black registre-loi0520-cell align-top" style="background-color: {getLoi0520ImpactBg(row.impactConfid0520) || '#fafafa'};">
									<div class="flex items-center gap-2 flex-wrap">
										{#if row.impactConfid0520}
											<span class="registre-loi0520-badge shrink-0 px-2 py-0.5 rounded text-xs font-bold shadow-sm" style="background-color: {getLoi0520ImpactBg(row.impactConfid0520)}; color: {getLoi0520BadgeTextColor(row.impactConfid0520)};">{getLoi0520LevelLabel(row.impactConfid0520)}</span>
										{/if}
										<select
											class="registre-loi0520-select flex-1 min-w-0 border border-gray-300 rounded px-2 py-1 bg-white/90 text-sm"
											title={row.impactConfid0520 || ''}
											bind:value={registreRows[i].impactConfid0520}
											on:change={() => saveCustomMethodState()}
										>
											<option value="">Choisir…</option>
											{#each REGISTRE_LOI0520_OPTIONS as opt}
												<option value={opt}>{opt}</option>
											{/each}
										</select>
									</div>
								</td>
								<!-- Section 7 – Sensibilité (Classe A/B/C/D, calculée) – rouge / orange / jaune / vert -->
								<td class="px-2 py-1 text-center border border-black font-semibold text-xs" style="background-color: {getSensibiliteClasse0520Bg(getSensibiliteClasse0520(row)) || '#f5f5f5'};">
									{getSensibiliteClasse0520(row)}
								</td>
								<!-- Section 7 – Confidentialité décret 05-20 (calculée) -->
								<td class="px-2 py-1 text-center border border-black bg-amber-50 font-semibold text-xs">
									{getConfidentialite0520(row)}
								</td>
								{/if}
								<!-- Commentaire -->
								<td class="px-2 py-1 border border-black bg-white min-h-[80px]">
									<textarea
										class="w-full border border-gray-300 rounded px-1 py-0.5 text-xs min-h-[80px] resize-y"
										bind:value={registreRows[i].commentaire}
										on:blur={() => saveCustomMethodState()}
										placeholder="Commentaire..."
									></textarea>
								</td>
								{#if editModeRegistre}
								<!-- Actions -->
								<td class="px-2 py-1 border border-black bg-gray-100">
									<div class="flex gap-1 justify-center flex-wrap">
										<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererLigneRegistreAvant(i)} title="Ajouter avant">↑+</button>
										<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererLigneRegistreApres(i)} title="Ajouter après">↓+</button>
										<button type="button" class="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerLigneRegistre(i)} title="Supprimer" disabled={registreRows.length <= 1}>✕</button>
									</div>
								</td>
								{/if}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>


			
		</section>
	{:else if activeSection === 'aide-classification'}
		<!-- Affichage seul des échelles (modification dans l'onglet Paramétrage) -->
		<section class="space-y-8">
			<h2 class="text-xl font-semibold text-gray-900">Aide-Classification</h2>
			<p class="text-sm text-gray-500">Affichage des échelles. Pour modifier, utilisez l'onglet <strong>Paramétrage</strong>.</p>

			<!-- Tableau 1 – Définitions générales D/I/C (lecture seule) -->
			<section class="space-y-3">
				<h3 class="text-lg font-semibold text-gray-900">
					Tableau 1 – Disponibilité, Intégrité, Confidentialité (définitions générales)
				</h3>
				<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
					<table class="min-w-full text-sm border-collapse border border-black">
						<thead>
							<tr>
								{#each dicCriteriaRows as criteria, i}
									<th class="px-4 py-2 text-left font-semibold text-black border border-black bg-sky-200">
										{dicCriteriaRows[i].critere}
									</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							<tr class="border border-black">
								{#each dicCriteriaRows as criteria, i}
									<td class="px-4 py-2 text-black border border-black bg-white align-top min-h-[80px]">
										<div class="w-full px-2 py-1 text-sm prose prose-sm max-w-none prose-p:my-1 text-left min-h-[80px]">
											{@html criteria.definition ?? ''}
										</div>
									</td>
								{/each}
							</tr>
						</tbody>
					</table>
				</div>
			</section>

			<!-- Tableau 1.2 – Niveaux de valeur par critère (lecture seule) -->
			<section class="space-y-3">
				<h3 class="text-lg font-semibold text-gray-900">
					Tableau 1.2 – Niveaux de valeur par critère (D / I / C)
				</h3>
				<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
					<table class="min-w-full text-sm border-collapse border border-black">
						<thead>
							<tr>
								<th class="px-4 py-2 text-left font-semibold text-black bg-sky-200 border border-black">Valeur</th>
								<th class="px-4 py-2 text-left font-semibold text-black bg-sky-200 border border-black">Disponibilité (D)</th>
								<th class="px-4 py-2 text-left font-semibold text-black bg-sky-200 border border-black">Intégrité (I)</th>
								<th class="px-4 py-2 text-left font-semibold text-black bg-sky-200 border border-black">Confidentialité (C)</th>
							</tr>
						</thead>
						<tbody>
							{#each dicNiveauxRows as row, i}
								<tr class="border border-black">
									<td class={`px-4 py-2 font-semibold text-white border border-black ${getValeurBg(row.valeur)}`}>
										{row.valeur}
									</td>
									<td class="px-4 py-2 text-black border border-black bg-white align-top text-xs min-h-[100px]">
										<div class="w-full px-2 py-1 text-xs prose prose-sm max-w-none prose-p:my-1 text-left">
											{@html row.disponibilite ?? ''}
										</div>
									</td>
									<td class="px-4 py-2 text-black border border-black bg-white align-top text-xs min-h-[100px]">
										<div class="w-full px-2 py-1 text-xs prose prose-sm max-w-none prose-p:my-1 text-left">
											{@html row.integrite ?? ''}
										</div>
									</td>
									<td class="px-4 py-2 text-black border border-black bg-white align-top text-xs min-h-[100px]">
										<div class="w-full px-2 py-1 text-xs prose prose-sm max-w-none prose-p:my-1 text-left">
											{@html row.confidentialite ?? ''}
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>

			<!-- Tableau 2 – Catégories d'actifs (lecture seule) -->
			<div class="flex flex-col lg:flex-row gap-6 items-stretch">
				<section class="space-y-3 flex-shrink-0 w-full lg:w-[55%] lg:max-w-[55%]">
					<h3 class="text-lg font-semibold text-gray-900">Tableau 2 – Catégories d'actifs</h3>
					<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
						<table class="w-full text-sm border-collapse border border-black table-fixed">
							<thead>
								<tr>
									<th class="px-2 py-3 text-left font-semibold text-black bg-sky-200 border border-black" style="width: 50%;">Catégories d'actifs</th>
									<th class="px-2 py-3 text-left font-semibold text-black bg-sky-200 border border-black" style="width: 50%;">Type d'actif</th>
								</tr>
							</thead>
							<tbody>
								{#each categoriesActifsRows as categorie}
									<tr class="border border-black">
										<td class="px-2 py-2 text-black border border-black bg-white text-center">{categorie.libelle}</td>
										<td class="px-2 py-2 text-black border border-black bg-white text-center">{categorie.type_actif}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</section>
				<section class="flex-shrink-0 w-full lg:max-w-[28%] min-w-0">
					<div class="rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-green-50 shadow-sm overflow-hidden">
						<div class="px-3 py-2 border-b border-green-200 bg-green-100/80">
							<h3 class="text-sm font-semibold text-green-900">Propriétaires des actifs</h3>
						</div>
						<div class="p-3">
							<p class="text-xs text-gray-700 leading-relaxed">
								Chaque actif informationnel doit être attribué formellement à un <strong class="text-gray-800">propriétaire</strong> qui a la responsabilité de la gestion des actifs (inventaire, classification, protection, destruction, réforme …) tout au long de leurs cycles de vie.
							</p>
						</div>
					</div>
				</section>
			</div>

			<!-- Classification selon la loi n° 05-20 (statique, inchangé) -->
			<section class="space-y-8">
				<h3 class="text-lg font-semibold text-gray-900">Classification selon la loi n° 05-20</h3>
				<!-- Tableau 1 — Échelle qualitative -->
				<section class="space-y-3">
					<h4 class="text-lg font-semibold text-gray-900">Tableau 1 — Échelle qualitative</h4>
					<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
						<table class="min-w-full text-sm border-collapse border border-black">
							<tbody>
								<tr>
									<td colspan="2" class="px-4 py-2 font-bold text-white border border-black" style="background-color: #E36C0A; color: #FFFFFF;">
										Echelle d'impact selon la loi n° 05.20 et son décret d'application
									</td>
								</tr>
								<tr>
									<td colspan="2" class="px-4 py-2 text-black border border-black bg-white whitespace-normal">
										Si un incident de cybersécurité portant sur la confidentialité, la disponibilité ou l'intégrité d'un actif informationnel pourrait :
									</td>
								</tr>
								<tr><td colspan="2" class="px-4 py-1 border border-black bg-white"></td></tr>
								<tr>
									<th class="px-4 py-2 font-bold text-white border border-black w-36 text-left" style="background-color: #E36C0A; color: #FFFFFF;">Valeur</th>
									<th class="px-4 py-2 font-bold text-white border border-black text-left" style="background-color: #E36C0A; color: #FFFFFF;">Un incident cybersécurité peut :</th>
								</tr>
								<tr>
									<td class="px-4 py-2 font-semibold text-black border border-black bg-white align-top">Très Grave</td>
									<td class="px-4 py-2 text-black border border-black bg-white align-top whitespace-normal">
										- nuire au maintien des capacités de sécurité et de défense de l'Etat ;<br/>
										- porter préjudice aux intérêts stratégiques de l'Etat ;<br/>
										- porter atteinte à la santé et à la sécurité de la population ;<br/>
										- perturber ou nuire au fonctionnement de l'économie nationale ;<br/>
										- engendrer une incapacité totale ou partielle de plusieurs infrastructures d'importance vitale à assurer leurs fonctions essentielles.
									</td>
								</tr>
								<tr>
									<td class="px-4 py-2 font-semibold text-black border border-black bg-white align-top">Grave</td>
									<td class="px-4 py-2 text-black border border-black bg-white align-top whitespace-normal">
										- une incapacité totale ou partielle d'une infrastructure d'importance vitale à assurer ses fonctions essentielles ;<br/>
										- une incapacité totale d'une ou plusieurs entités non considérées comme infrastructures d'importance vitale à assurer leurs fonctions critiques ;<br/>
										- des pertes financières importantes pour une ou plusieurs entités ou infrastructures d'importance vitale
									</td>
								</tr>
								<tr>
									<td class="px-4 py-2 font-semibold text-black border border-black bg-white align-top">Modéré</td>
									<td class="px-4 py-2 text-black border border-black bg-white align-top whitespace-normal">
										- une gêne ou perturbation mineure dans les fonctions d'une infrastructure d'importance vitale ;<br/>
										- une incapacité partielle d'une ou de plusieurs entités non considérées comme infrastructures d'importance vitale, à assurer leurs fonctions ;<br/>
										- des pertes financières modérées ;<br/>
										- ou toute autre conséquence de nature analogue.
									</td>
								</tr>
								<tr>
									<td class="px-4 py-2 font-semibold text-black border border-black bg-white align-top">Limité</td>
									<td class="px-4 py-2 text-black border border-black bg-white align-top whitespace-normal">
										- une gêne ou perturbation dans les fonctions de l'entité non considérée comme infrastructure d'importance vitale ;<br/>
										- des pertes financières limitées ;<br/>
										- ou toute autre conséquence de nature analogue.
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</section>
				<!-- Tableau 2 — Échelle numérique avec code couleur -->
				<section class="space-y-3">
					<h4 class="text-lg font-semibold text-gray-900">Tableau 2 — Échelle numérique avec code couleur</h4>
					<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
						<table class="min-w-full text-sm border-collapse border border-black">
							<thead>
								<tr>
									<th class="px-4 py-2 font-bold text-black border border-black w-20 text-center" style="background-color: #FFC000;">VALEUR</th>
									<th colspan="2" class="px-4 py-2 font-bold text-black border border-black text-left" style="background-color: #FFC000;">Echelle d'impact du référentiel fixé par la loi n° 05.20 et son décret d'application</th>
								</tr>
							</thead>
							<tbody>
								<tr><td class="px-4 py-2 text-center font-semibold border border-black bg-white">4</td><td colspan="2" class="px-4 py-2 text-black border border-black whitespace-normal align-top" style="background-color: #f87171;">TG: nuire au maintien des capacités de sécurité et de défense de l'Etat ;</td></tr>
								<tr><td class="px-4 py-2 text-center font-semibold border border-black bg-white">4</td><td colspan="2" class="px-4 py-2 text-black border border-black whitespace-normal align-top" style="background-color: #f87171;">TG: porter préjudice aux intérêts stratégiques de l'Etat ;</td></tr>
								<tr><td class="px-4 py-2 text-center font-semibold border border-black bg-white">4</td><td colspan="2" class="px-4 py-2 text-black border border-black whitespace-normal align-top" style="background-color: #f87171;">TG: porter atteinte à la santé et à la sécurité de la population ;</td></tr>
								<tr><td class="px-4 py-2 text-center font-semibold border border-black bg-white">4</td><td colspan="2" class="px-4 py-2 text-black border border-black whitespace-normal align-top" style="background-color: #f87171;">TG: perturber ou nuire au fonctionnement de l'économie nationale ;</td></tr>
								<tr><td class="px-4 py-2 text-center font-semibold border border-black bg-white">4</td><td colspan="2" class="px-4 py-2 text-black border border-black whitespace-normal align-top" style="background-color: #f87171;">TG: engendrer une incapacité totale ou partielle de plusieurs infrastructures d'importance vitale à assurer leurs fonctions essentielles.</td></tr>
								<tr><td class="px-4 py-2 text-center font-semibold border border-black bg-white">3</td><td colspan="2" class="px-4 py-2 text-black border border-black whitespace-normal align-top" style="background-color: #fb923c;">G: une incapacité totale ou partielle d'une infrastructure d'importance vitale à assurer ses fonctions essentielles ;</td></tr>
								<tr><td class="px-4 py-2 text-center font-semibold border border-black bg-white">3</td><td colspan="2" class="px-4 py-2 text-black border border-black whitespace-normal align-top" style="background-color: #fb923c;">G: une incapacité totale d'une ou plusieurs entités non considérées comme infrastructures d'importance vitale à assurer leurs fonctions critiques ;</td></tr>
								<tr><td class="px-4 py-2 text-center font-semibold border border-black bg-white">3</td><td colspan="2" class="px-4 py-2 text-black border border-black whitespace-normal align-top" style="background-color: #fb923c;">G: des pertes financières importantes pour une ou plusieurs entités ou infrastructures d'importance vitale</td></tr>
								<tr><td class="px-4 py-2 text-center font-semibold border border-black bg-white">2</td><td colspan="2" class="px-4 py-2 text-black border border-black whitespace-normal align-top" style="background-color: #FFFF00;">M: une gêne ou perturbation mineure dans les fonctions d'une infrastructure d'importance vitale ;</td></tr>
								<tr><td class="px-4 py-2 text-center font-semibold border border-black bg-white">2</td><td colspan="2" class="px-4 py-2 text-black border border-black whitespace-normal align-top" style="background-color: #FFFF00;">M: une incapacité partielle d'une ou de plusieurs entités non considérées comme infrastructures d'importance vitale, à assurer leurs fonctions ;</td></tr>
								<tr><td class="px-4 py-2 text-center font-semibold border border-black bg-white">2</td><td colspan="2" class="px-4 py-2 text-black border border-black whitespace-normal align-top" style="background-color: #FFFF00;">M: des pertes financières modérées ;</td></tr>
								<tr><td class="px-4 py-2 text-center font-semibold border border-black bg-white">2</td><td colspan="2" class="px-4 py-2 text-black border border-black whitespace-normal align-top" style="background-color: #FFFF00;">M: ou toute autre conséquence de nature analogue</td></tr>
								<tr><td class="px-4 py-2 text-center font-semibold border border-black bg-white">1</td><td colspan="2" class="px-4 py-2 text-black border border-black whitespace-normal align-top" style="background-color: #A1FB7D;">L: une gêne ou perturbation dans les fonctions de l'entité non considérée comme infrastructure d'importance vitale ;</td></tr>
								<tr><td class="px-4 py-2 text-center font-semibold border border-black bg-white">1</td><td colspan="2" class="px-4 py-2 text-black border border-black whitespace-normal align-top" style="background-color: #A1FB7D;">L: des pertes financières limitées ;</td></tr>
								<tr><td class="px-4 py-2 text-center font-semibold border border-black bg-white">1</td><td colspan="2" class="px-4 py-2 text-black border border-black whitespace-normal align-top" style="background-color: #A1FB7D;">L: ou toute autre conséquence de nature analogue.</td></tr>
							</tbody>
						</table>
					</div>
				</section>
			</section>
		</section>
	{:else if activeSection === 'parametrage'}
		<!-- Paramétrage du projet : modification Aide-Classification, Aide-Risque, Échelle PTR -->
		<section class="space-y-10 pb-24">
			<div>
				<h2 class="text-xl font-semibold text-gray-900">Paramétrage du projet</h2>
				<p class="text-sm text-gray-600 mt-1">Modifiez l'aide à la classification, l'aide risque et l'échelle PTR pour le projet <strong>{projects[activeProjectId]?.name ?? 'Projet par défaut'}</strong>. Les sections Aide-Classification, Aide-Risque et Échelle-PTR restent en affichage seul.</p>
			</div>

			<!-- === Paramétrage : Aide-Classification (édition) === -->
			<section class="space-y-6  rounded-xl p-6 ">
				<h3 class="text-lg font-semibold text-gray-900">Aide-Classification</h3>
				<!-- Tableau 1 DIC -->
				<section class="space-y-3">
					<h4 class="text-base font-semibold text-gray-900">Tableau 1 – Définitions générales D/I/C</h4>
					<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
						<table class="min-w-full text-sm border-collapse border border-black">
							<thead>
								<tr>
									{#each dicCriteriaRows as criteria, i}
										<th class="px-4 py-2 text-left font-semibold text-black border border-black bg-sky-200">
											<input class="w-full bg-transparent border-0 rounded px-2 py-1 font-semibold focus:outline-none focus:ring-0" type="text" bind:value={dicCriteriaRows[i].critere} on:blur={() => saveCustomMethodState()} />
										</th>
									{/each}
								</tr>
							</thead>
							<tbody>
								<tr class="border border-black">
									{#each dicCriteriaRows as criteria, i}
										<td class="px-4 py-2 text-black border border-black bg-white align-top min-h-[80px]">
											{#if isEditing('dicCriteriaParam', 0, String(i))}
												<textarea use:focusTextareaOnMount class="w-full border border-gray-300 rounded px-2 py-1 text-sm min-h-[80px]" bind:value={dicCriteriaRows[i].definition} on:blur={stopEditing} on:keydown={(e) => e.key === 'Escape' && (editingCell = null)}></textarea>
											{:else}
												<div role="button" tabindex="0" class="w-full px-2 py-1 text-sm prose prose-sm max-w-none prose-p:my-1 text-left border border-transparent rounded hover:border-gray-300 hover:bg-gray-50 cursor-text focus:outline-none focus:ring-1 focus:ring-sky-500 min-h-[80px]" on:click={() => startEditing('dicCriteriaParam', 0, String(i))} on:keydown={(e) => e.key === 'Enter' || e.key === ' ' ? (e.preventDefault(), startEditing('dicCriteriaParam', 0, String(i))) : null}>
													{@html criteria.definition ?? ''}
												</div>
											{/if}
										</td>
									{/each}
								</tr>
							</tbody>
						</table>
					</div>
				</section>
				<!-- Tableau 1.2 Niveaux DIC -->
				<section class="space-y-3">
					<h4 class="text-base font-semibold text-gray-900">Tableau 1.2 – Niveaux de valeur par critère (D / I / C)</h4>
					<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
						<table class="min-w-full text-sm border-collapse border border-black">
							<thead>
								<tr>
									<th class="px-4 py-2 text-left font-semibold text-black bg-sky-200 border border-black">Valeur</th>
									<th class="px-2 py-2 text-center font-semibold text-black bg-sky-200 border border-black min-w-[120px]">Couleur</th>
									<th class="px-4 py-2 text-left font-semibold text-black bg-sky-200 border border-black">Disponibilité (D)</th>
									<th class="px-4 py-2 text-left font-semibold text-black bg-sky-200 border border-black">Intégrité (I)</th>
									<th class="px-4 py-2 text-left font-semibold text-black bg-sky-200 border border-black">Confidentialité (C)</th>
									<th class="px-2 py-2 text-center font-semibold text-black bg-sky-200 border border-black">Actions</th>
								</tr>
							</thead>
							<tbody>
								{#each dicNiveauxRows as row, i}
									<tr class="border border-black">
										<td class={`px-4 py-2 font-semibold text-white border border-black ${getValeurBg(row.valeur)}`}>
											<input class="w-full border border-transparent bg-transparent font-semibold text-white placeholder-white/70" type="text" bind:value={dicNiveauxRows[i].valeur} on:change={() => saveCustomMethodState()} />
										</td>
										<td class="px-2 py-2 border border-black bg-gray-50 align-middle">
											<select class="w-full border border-gray-300 rounded px-1 py-0.5 text-xs" bind:value={dicNiveauxRows[i].bgColor} on:change={() => saveCustomMethodState()}>
												{#each DIC_NIVEAU_COULEURS as c}
													<option value={c}>{c}</option>
												{/each}
											</select>
										</td>
										<td class="px-4 py-2 text-black border border-black bg-white align-top text-xs min-h-[100px]">
											<textarea class="w-full border border-gray-300 rounded px-2 py-1 text-xs min-h-[100px]" bind:value={dicNiveauxRows[i].disponibilite} on:blur={() => saveCustomMethodState()}></textarea>
										</td>
										<td class="px-4 py-2 text-black border border-black bg-white align-top text-xs min-h-[100px]">
											<textarea class="w-full border border-gray-300 rounded px-2 py-1 text-xs min-h-[100px]" bind:value={dicNiveauxRows[i].integrite} on:blur={() => saveCustomMethodState()}></textarea>
										</td>
										<td class="px-4 py-2 text-black border border-black bg-white align-top text-xs min-h-[100px]">
											<textarea class="w-full border border-gray-300 rounded px-2 py-1 text-xs min-h-[100px]" bind:value={dicNiveauxRows[i].confidentialite} on:blur={() => saveCustomMethodState()}></textarea>
										</td>
										<td class="px-2 py-2 border border-black bg-gray-100">
											<div class="flex gap-1 justify-center flex-wrap">
												<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererNiveauDicAvant(i)} title="Ajouter avant">↑+</button>
												<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererNiveauDicApres(i)} title="Ajouter après">↓+</button>
												<button type="button" class="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerNiveauDic(i)} title="Supprimer" disabled={dicNiveauxRows.length <= 1}>✕</button>
											</div>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
					<div class="flex gap-2">
						<button type="button" class="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700" on:click={ajouterNiveauDic}>+ Ajouter un niveau</button>
						{#if dicNiveauxRows.length > 1}
							<button type="button" class="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerNiveauDic(dicNiveauxRows.length - 1)}>- Supprimer la dernière ligne</button>
						{/if}
					</div>
				</section>
				<!-- Tableau 2 Catégories d'actifs -->
				<section class="space-y-3">
					<h4 class="text-base font-semibold text-gray-900">Tableau 2 – Catégories d'actifs</h4>
					<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
						<table class="w-full text-sm border-collapse border border-black table-fixed">
							<thead>
								<tr>
									<th class="px-2 py-3 text-left font-semibold text-black bg-sky-200 border border-black" style="width: 50%;">Catégories d'actifs</th>
									<th class="px-2 py-3 text-left font-semibold text-black bg-sky-200 border border-black" style="width: 40%;">Type d'actif</th>
									<th class="px-2 py-3 text-left font-semibold text-black bg-sky-200 border border-black" style="width: 10%;">Actions</th>
								</tr>
							</thead>
							<tbody>
								{#each categoriesActifsRows as categorie, i}
									<tr class="border border-black">
										<td class="px-2 py-2 text-black border border-black bg-white text-center">
											<input class="w-full border border-gray-300 rounded px-1.5 py-1 text-sm text-center" type="text" bind:value={categoriesActifsRows[i].libelle} on:blur={() => saveCustomMethodState()} />
										</td>
										<td class="px-2 py-2 text-black border border-black bg-white text-center">
											<select class="w-full border border-gray-300 rounded px-1.5 py-1 text-sm" value={categoriesActifsRows[i].type_actif} on:change={(e) => { const v = (e.target as HTMLSelectElement).value; categoriesActifsRows[i].type_actif = v; syncRegistreTypeActifPourCategorie(categoriesActifsRows[i].libelle, v); saveCustomMethodState(); }}>
												<option value="Actif primaire">Actif primaire</option>
												<option value="Actif support">Actif support</option>
											</select>
										</td>
										<td class="px-2 py-2 border border-black bg-gray-100">
											<div class="flex gap-1 justify-center">
												<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererCategorieActifAvant(i)} title="Ajouter avant">↑+</button>
												<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererCategorieActifApres(i)} title="Ajouter après">↓+</button>
												<button type="button" class="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerCategorieActif(i)} title="Supprimer">✕</button>
											</div>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
					<div class="flex gap-2">
						<button type="button" class="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700" on:click={ajouterCategorieActif}>+ Ajouter une ligne</button>
						{#if categoriesActifsRows.length > 1}
							<button type="button" class="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerCategorieActif(categoriesActifsRows.length - 1)}>- Supprimer la dernière ligne</button>
						{/if}
					</div>
				</section>
			</section>

			<!-- === Aide-Risque (édition) === -->
			<section class="space-y-6  rounded-xl p-6  mt-8">
				<h3 class="text-lg font-semibold text-gray-900">Aide-Risque</h3>
			<!-- Tableau 1 – Échelle de probabilité / fréquence -->
			<section class="space-y-3">
				<h3 class="text-lg font-semibold text-gray-900">
					Tableau 1&nbsp;: Échelle de probabilité / fréquence
				</h3>
				<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
					<table class="min-w-full text-sm border-collapse border border-black">
						<thead>
							<tr>
								<th class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">Échelle</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">Définition</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">Fréquence</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">Désignation de la probabilité</th>
								{#if true}
									<th class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">Couleur</th>
									<th class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">Actions</th>
								{/if}
							</tr>
						</thead>
						<tbody>
							{#each probaRows as row, i}
								<tr class="border border-black">
									<td class="cell-bg-white px-4 py-2 text-black border border-black bg-white">
										<input class="w-full border border-gray-300 rounded px-2 py-1 text-sm" type="text" bind:value={probaRows[i].echelle} />
									</td>
									<td class={`px-4 py-2 cell-colored-definition ${getProbaRowBg(row)}`}>
										<input class="w-full border border-transparent bg-transparent font-semibold" type="text" bind:value={probaRows[i].definition} />
									</td>
									<td class="cell-bg-white px-4 py-2 text-black border border-black bg-white align-top">
										<textarea class="w-full border border-gray-300 rounded px-2 py-1 text-xs min-h-[60px]" bind:value={probaRows[i].frequence}></textarea>
									</td>
									<td class="cell-bg-white px-4 py-2 text-black border border-black bg-white align-top">
										<textarea class="w-full border border-gray-300 rounded px-2 py-1 text-xs min-h-[60px]" bind:value={probaRows[i].historique}></textarea>
									</td>
									{#if true}
										<td class="px-2 py-2 border border-black bg-gray-100">
											<select class="w-full text-xs rounded border border-gray-300 px-1 py-1" bind:value={probaRows[i].bgColor} on:change={() => saveCustomMethodState()}>
												{#each AIDE_RISQUE_COULEURS as c}
													<option value={c}>{c.replace('bg-', '').replace(' text-', ' / ')}</option>
												{/each}
											</select>
										</td>
										<td class="px-4 py-2 border border-black bg-gray-100 text-center">
											<div class="flex gap-1 justify-center flex-wrap">
												<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererProbaAvant(i)} title="Ajouter avant">↑+</button>
												<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererProbaApres(i)} title="Ajouter après">↓+</button>
												<button type="button" class="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerProba(i)} title="Supprimer" disabled={probaRows.length <= 1}>✕</button>
											</div>
										</td>
									{/if}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				{#if true}
					<div class="flex gap-2 mt-2">
						<button type="button" class="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700" on:click={ajouterProba}>+ Ajouter une ligne</button>
						{#if probaRows.length > 1}
							<button type="button" class="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerProba(probaRows.length - 1)}>- Supprimer la dernière ligne</button>
						{/if}
					</div>
				{/if}
			</section>

			<!-- Critères d'impact (définit les types d'impacts ; affiché avant le Tableau 2 pour enchaîner logiquement) -->
			<section class="space-y-3">
				<h3 class="text-lg font-semibold text-gray-900">Critères d'impact</h3>
				<p class="text-sm text-gray-600">
					Ce tableau définit les types d'impacts utilisés dans l'évaluation de la criticité du risque brut. Les libellés et définitions sont repris dans la cartographie des risques (colonnes Impact). Modifier ce tableau ajoute ou supprime des colonnes dans la cartographie et dans le Tableau 2 ci‑dessous.
				</p>
				<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
					<table class="min-w-full text-sm border-collapse border border-black">
						<thead>
							<tr>
								<th class="px-4 py-2 text-left font-semibold text-white bg-orange-600 border border-black">Libellé (Impact)</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-orange-600 border border-black">Définition</th>
								{#if true}
									<th class="px-4 py-2 text-center font-semibold text-white bg-orange-600 border border-black">Actions</th>
								{/if}
							</tr>
						</thead>
						<tbody>
							{#each impactDefinitionsRows as def, i}
								<tr class="border border-black">
									<td class="cell-bg-white px-4 py-2 text-black border border-black bg-white">
										<input class="w-full border border-gray-300 rounded px-2 py-1 text-sm" type="text" bind:value={impactDefinitionsRows[i].libelle} placeholder="Ex. Impact Financier" on:change={() => saveCustomMethodState()} />
									</td>
									<td class="cell-bg-white px-4 py-2 text-black border border-black bg-white align-top">
										<textarea class="w-full border border-gray-300 rounded px-2 py-1 text-xs min-h-[60px]" bind:value={impactDefinitionsRows[i].definition} placeholder="Explication de l'impact..." on:blur={() => saveCustomMethodState()}></textarea>
									</td>
									{#if true}
										<td class="px-4 py-2 border border-black bg-gray-100 text-center">
											<div class="flex gap-1 justify-center flex-wrap">
												<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => { impactDefinitionsRows = insererLigneAvant(impactDefinitionsRows, i, { libelle: '', definition: '' }); syncCartoRowsImpacts(); syncImpactRowsCriteres(); saveCustomMethodState(); }} title="Ajouter avant">↑+</button>
												<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => { impactDefinitionsRows = insererLigneApres(impactDefinitionsRows, i, { libelle: '', definition: '' }); syncCartoRowsImpacts(); syncImpactRowsCriteres(); saveCustomMethodState(); }} title="Ajouter après">↓+</button>
												<button type="button" class="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerDefinitionImpact(i)} title="Supprimer" disabled={impactDefinitionsRows.length <= 1}>✕</button>
											</div>
										</td>
									{/if}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				{#if true}
					<div class="flex gap-2 mt-2">
						<button type="button" class="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700" on:click={ajouterDefinitionImpact}>+ Ajouter une ligne</button>
						{#if impactDefinitionsRows.length > 1}
							<button type="button" class="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerDefinitionImpact(impactDefinitionsRows.length - 1)}>- Supprimer la dernière ligne</button>
						{/if}
					</div>
				{/if}
			</section>

			<!-- Tableau 2 – Échelle d'impact (colonnes = critères d'impact, synchronisées avec le tableau Critères d'impact ci‑dessus) -->
			<section class="space-y-3">
				<h3 class="text-lg font-semibold text-gray-900">Tableau 2&nbsp;: Échelle d'impact</h3>
				<p class="text-xs text-gray-600">
					Les colonnes d'impact sont synchronisées avec le tableau «&nbsp;Critères d'impact&nbsp;» ci‑dessus&nbsp;: ajouter un critère ajoute une colonne ici (données par niveau à renseigner ou «&nbsp;À déterminer&nbsp;»).
				</p>
				<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
					<table class="min-w-full text-sm border-collapse border border-black">
						<thead>
							<tr>
								<th class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">Échelle</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">Définition</th>
								{#each impactDefinitionsRows as def}
									<th class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">{def.libelle || 'Critère'}</th>
								{/each}
								{#if true}
									<th class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">Couleur</th>
									<th class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">Actions</th>
								{/if}
							</tr>
						</thead>
						<tbody>
							{#each impactRows as row, i}
								{@const criteres = getImpactRowCriteres(row)}
								<tr class="border border-black">
									<td class="cell-bg-white px-4 py-2 text-black border border-black bg-white">
										<input class="w-full border border-gray-300 rounded px-2 py-1 text-sm" type="text" bind:value={impactRows[i].echelle} />
									</td>
									<td class={`px-4 py-2 cell-colored-definition ${getImpactRowBg(row)}`}>
										<input class="w-full border border-transparent bg-transparent font-semibold" type="text" bind:value={impactRows[i].definition} />
									</td>
									{#each impactDefinitionsRows as def, idx}
										<td class="cell-bg-white px-4 py-2 text-black border border-black bg-white align-top">
											<textarea
												class="w-full border border-gray-300 rounded px-2 py-1 text-xs min-h-[60px]"
												value={criteres[idx]}
												on:input={(e) => {
													const v = (e.target as HTMLTextAreaElement).value;
													const r = impactRows[i];
													if (!r.criteres || r.criteres.length !== impactDefinitionsRows.length) r.criteres = getImpactRowCriteres(r).slice();
													r.criteres[idx] = v;
													impactRows = impactRows;
													saveCustomMethodState();
												}}
											></textarea>
										</td>
									{/each}
									{#if true}
										<td class="px-2 py-2 border border-black bg-gray-100">
											<select class="w-full text-xs rounded border border-gray-300 px-1 py-1" bind:value={impactRows[i].bgColor} on:change={() => saveCustomMethodState()}>
												{#each AIDE_RISQUE_COULEURS as c}
													<option value={c}>{c.replace('bg-', '').replace(' text-', ' / ')}</option>
												{/each}
											</select>
										</td>
										<td class="px-4 py-2 border border-black bg-gray-100 text-center">
											<div class="flex gap-1 justify-center flex-wrap">
												<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererImpactAvant(i)} title="Ajouter avant">↑+</button>
												<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererImpactApres(i)} title="Ajouter après">↓+</button>
												<button type="button" class="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerImpact(i)} title="Supprimer" disabled={impactRows.length <= 1}>✕</button>
											</div>
										</td>
									{/if}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				{#if true}
					<div class="flex gap-2 mt-2">
						<button type="button" class="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700" on:click={ajouterImpact}>+ Ajouter une ligne</button>
						{#if impactRows.length > 1}
							<button type="button" class="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerImpact(impactRows.length - 1)}>- Supprimer la dernière ligne</button>
						{/if}
					</div>
				{/if}
				<p class="text-xs text-gray-600">
					Les libellés des colonnes (Financier, Réputation, Parties prenantes, Réglementaire, etc.) sont des axes d'analyse principaux à adapter dans «&nbsp;Critères d'impact&nbsp;» ci‑dessus.
				</p>
			</section>

			<!-- Tableau 3.1 – Fréquence / probabilité d'occurrence (échelle de risque) -->
			<section class="space-y-3">
				<h3 class="text-lg font-semibold text-gray-900">
					Tableau 3.1&nbsp;: Fréquence / probabilité d'occurrence (échelle de risque)
				</h3>
				<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
					<table class="min-w-full text-sm border-collapse border border-black">
						<thead>
							<tr>
								<th colspan="5" class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">
									Fréquence / Probabilité d'occurrence
								</th>
							</tr>
							<tr>
								<th class="px-4 py-2 text-left font-semibold text-white bg-slate-900 border border-black">Échelle</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-slate-900 border border-black">Définition</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-slate-900 border border-black">Signification</th>
								{#if true}
									<th class="px-4 py-2 text-left font-semibold text-white bg-slate-900 border border-black">Couleur</th>
									<th class="px-4 py-2 text-left font-semibold text-white bg-slate-900 border border-black">Actions</th>
								{/if}
							</tr>
						</thead>
						<tbody>
							{#each frequenceRisqueRows as row, i}
								<tr class="border border-black">
									<td class="cell-bg-white px-4 py-2 text-black border border-black bg-white">
										<input class="w-full border border-gray-300 rounded px-2 py-1 text-sm" type="text" bind:value={frequenceRisqueRows[i].echelle} />
									</td>
									<td class={`px-4 py-2 cell-colored-definition ${getFrequenceRowBg(row)}`}>
										<input class="w-full border border-transparent bg-transparent font-semibold" type="text" bind:value={frequenceRisqueRows[i].definition} />
									</td>
									<td class="cell-bg-white px-4 py-2 text-black border border-black bg-white">
										<input class="w-full border border-gray-300 rounded px-2 py-1 text-sm" type="text" bind:value={frequenceRisqueRows[i].signification} />
									</td>
									{#if true}
										<td class="px-2 py-2 border border-black bg-gray-100">
											<select class="w-full text-xs rounded border border-gray-300 px-1 py-1" bind:value={(frequenceRisqueRows[i] as Row & { bgColor?: string }).bgColor} on:change={() => saveCustomMethodState()}>
												{#each AIDE_RISQUE_COULEURS as c}
													<option value={c}>{c.replace('bg-', '').replace(' text-', ' / ')}</option>
												{/each}
											</select>
										</td>
										<td class="px-4 py-2 border border-black bg-gray-100 text-center">
											<div class="flex gap-1 justify-center flex-wrap">
												<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererFrequenceAvant(i)} title="Ajouter avant">↑+</button>
												<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererFrequenceApres(i)} title="Ajouter après">↓+</button>
												<button type="button" class="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerFrequence(i)} title="Supprimer" disabled={frequenceRisqueRows.length <= 1}>✕</button>
											</div>
										</td>
									{/if}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				{#if true}
					<div class="flex gap-2 mt-2">
						<button type="button" class="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700" on:click={ajouterFrequence}>+ Ajouter une ligne</button>
						{#if frequenceRisqueRows.length > 1}
							<button type="button" class="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerFrequence(frequenceRisqueRows.length - 1)}>- Supprimer la dernière ligne</button>
						{/if}
					</div>
				{/if}
			</section>

			<!-- Tableau 3.2 – Matrice de vraisemblance du risque (couleurs selon intervalles du tableau 3.1) -->
			<section class="space-y-3">
				<h3 class="text-lg font-semibold text-gray-900">
					Tableau 3.2&nbsp;: Matrice de vraisemblance du risque
				</h3>
				<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
					<table class="min-w-full text-sm border-collapse border border-black">
						<thead>
							<tr>
								<th class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">
									Impact du risque × Criticité de l'actif \ Vraisemblance du risque
								</th>
								<!-- Colonnes de données : en-têtes 1, 2, …, n (toujours avant Actions) ; nouvelle colonne = n+1 -->
								{#each Array.from({ length: getMatriceColumnCount() }, (_, i) => i) as colIndex}
									<th class="px-4 py-2 text-sm font-semibold border border-black bg-gray-100 relative">
										{colIndex + 1}
										{#if getMatriceColumnCount() > 1}
											<button type="button" class="absolute -top-0.5 -right-0.5 w-5 h-5 text-[10px] bg-red-600 text-white rounded-full hover:bg-red-700 leading-none" title="Supprimer cette colonne" on:click={() => supprimerColonneMatrice(colIndex)}>✕</button>
										{/if}
									</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each matriceRisqueRows as row, i}
								<tr class="border border-black">
									<td class="cell-bg-white px-2 py-2 text-sm border border-black bg-white">
										<input class="w-20 border border-gray-300 rounded px-1 py-0.5 text-sm" type="text" bind:value={matriceRisqueRows[i].libelle} />
									</td>
									{#each row.valeurs as v, j}
										<td class={`px-2 py-2 text-xs text-center border border-black cell-colored-matrice ${getMatriceCellBgFromFrequence(v)}`}>
											{#if readOnlyAideRisque}
												<span class="inline-block w-full text-center font-medium tabular-nums">{matriceRisqueRows[i].valeurs[j]}</span>
											{:else}
												<input class="w-16 text-center border border-gray-300 rounded px-1 py-0.5 text-xs bg-transparent" type="number" bind:value={matriceRisqueRows[i].valeurs[j]} />
											{/if}
										</td>
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				{#if true}
					<div class="flex gap-2 mt-2 flex-wrap">
						<button type="button" class="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700" on:click={ajouterMatrice}>+ Ajouter une ligne</button>
						{#if matriceRisqueRows.length > 1}
							<button type="button" class="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerMatrice(matriceRisqueRows.length - 1)}>- Supprimer la dernière ligne</button>
						{/if}
						<button type="button" class="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700" on:click={ajouterColonneMatrice} title="Ajoute une colonne avant Actions avec l'en-tête n°{getMatriceColumnCount() + 1}">+ Ajouter une colonne (n°{getMatriceColumnCount() + 1})</button>
						{#if getMatriceColumnCount() > 1}
							<button type="button" class="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerColonneMatrice(getMatriceColumnCount() - 1)}>- Supprimer la dernière colonne</button>
						{/if}
					</div>
				{/if}
				<p class="text-xs text-gray-600">
					Les couleurs des cellules sont déterminées par les intervalles du tableau «&nbsp;Fréquence / probabilité d'occurrence&nbsp;» (Tableau 3.1). Modifiez ces intervalles pour que la matrice reflète vos seuils.
				</p>
			</section>

			<!-- Tableau : Niveaux d'efficacité (échelle 1-5) -->
			<section class="space-y-3">
				<h3 class="text-lg font-semibold text-gray-900">
					Niveaux d'efficacité
				</h3>
				<div class="overflow-x-auto overflow-hidden rounded-lg border border-black bg-white shadow-sm">
					<table class="min-w-full text-sm border-collapse border border-black">
						<colgroup>
							<col style="width: 3rem;" />
							<col style="width: 6rem;" />
							<col style="width: 38px;" />
							<col style="width: 38px;" />
							<col style="width: 38px;" />
							<col style="width: 8rem;" />
							<col style="width: 4rem;" />
							{#if true}
								<col style="width: 6rem;" />
								<col style="width: 5rem;" />
							{/if}
						</colgroup>
						<thead>
							<tr>
								<th class="px-3 py-2.5 text-center text-[11px] font-bold text-white border border-black whitespace-nowrap" style="background-color: #263c18;">
									Niveau
								</th>
								<th class="px-3 py-2.5 text-center text-[11px] font-bold text-white border border-black whitespace-nowrap" style="background-color: #263c18;">
									Signification
								</th>
								<th colspan="3" class="px-3 py-2.5 text-center text-[11px] font-bold text-white border border-black" style="background-color: #263c18;">
									Descriptif
								</th>
								<th class="px-3 py-2.5 text-center text-[11px] font-bold text-white border border-black whitespace-nowrap" style="background-color: #263c18;">
									Intervalle d'efficacité (%)
								</th>
								<th class="px-3 py-2.5 text-center text-[11px] font-bold text-white border border-black whitespace-nowrap" style="background-color: #263c18;">
									Valeur correspondante
								</th>
								{#if true}
									<th class="px-3 py-2.5 text-center text-[11px] font-bold text-white border border-black whitespace-nowrap" style="background-color: #263c18;">Couleur</th>
									<th class="px-3 py-2.5 text-center text-[11px] font-bold text-white border border-black whitespace-nowrap" style="background-color: #263c18;">Actions</th>
								{/if}
							</tr>
						</thead>
						<tbody>
							{#each efficaciteRows as row, i}
								<tr class="border border-black">
									<td class="cell-bg-white px-3 py-2 text-center border border-black bg-white">
										<input class="w-full border border-gray-300 rounded px-2 py-1 text-sm font-bold text-center" type="text" bind:value={efficaciteRows[i].niveau} on:input={invalidateEfficaciteRows} on:blur={commitEfficaciteRows} />
									</td>
									<td class={`px-3 py-2 text-center font-bold cell-colored-definition ${getEfficaciteRowBg(row)}`}>
										<input class="w-full border border-transparent bg-transparent font-semibold text-center" type="text" bind:value={efficaciteRows[i].signification} on:input={invalidateEfficaciteRows} on:blur={commitEfficaciteRows} />
									</td>
									<td colspan="3" class="cell-bg-white px-3 py-3 text-left align-middle border border-black bg-white align-top">
										<textarea class="w-full min-h-[120px] min-w-0 border border-gray-300 rounded px-2 py-1.5 text-base whitespace-pre-wrap" bind:value={efficaciteRows[i].descriptif} on:input={invalidateEfficaciteRows} on:blur={commitEfficaciteRows} placeholder="Descriptif du niveau…"></textarea>									</td>
									<td class="cell-bg-white px-3 py-2 text-center border border-black bg-white">
										<input class="w-full border border-gray-300 rounded px-2 py-1 text-sm font-bold text-center" type="text" bind:value={efficaciteRows[i].intervalle} on:input={invalidateEfficaciteRows} on:blur={commitEfficaciteRows} placeholder="0 % – 30 %" />
									</td>
									<td class="cell-bg-white px-3 py-2 text-center border border-black bg-white">
										<input class="w-full border border-gray-300 rounded px-2 py-1 text-sm text-center" type="text" inputmode="decimal" bind:value={efficaciteRows[i].valeur} on:input={invalidateEfficaciteRows} on:blur={commitEfficaciteRows} placeholder="0.15" />
									</td>
									{#if true}
										<td class="px-2 py-2 border border-black bg-gray-100">
											<select class="w-full text-xs rounded border border-gray-300 px-1 py-1" bind:value={efficaciteRows[i].bgColor} on:change={() => saveCustomMethodState()}>
												{#each AIDE_RISQUE_COULEURS as c}
													<option value={c}>{c.replace('bg-', '').replace(' text-', ' / ')}</option>
												{/each}
											</select>
										</td>
										<td class="px-3 py-2 border border-black bg-gray-100 text-center">
											<div class="flex gap-1 justify-center flex-wrap">
												<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererEfficaciteAvant(i)} title="Ajouter avant">↑+</button>
												<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererEfficaciteApres(i)} title="Ajouter après">↓+</button>
												<button type="button" class="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerEfficacite(i)} title="Supprimer" disabled={efficaciteRows.length <= 1}>✕</button>
											</div>
										</td>
									{/if}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				{#if true}
					<div class="flex gap-2 mt-2">
						<button type="button" class="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700" on:click={ajouterEfficacite}>+ Ajouter une ligne</button>
						{#if efficaciteRows.length > 1}
							<button type="button" class="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerEfficacite(efficaciteRows.length - 1)}>- Supprimer la dernière ligne</button>
						{/if}
					</div>
				{/if}
				
			</section>
		</section>
			<!-- === Échelle PTR (édition) === -->
			<!--  <section class="space-y-6  rounded-xl p-6  mt-8">=== -->
			<section class="space-y-6  rounded-xl p-6  mt-8">
				<h3 class="text-lg font-semibold text-gray-900">Échelle PTR</h3>
			<section class="space-y-4">
				<h3 class="text-lg font-semibold text-gray-900">Table 1&nbsp;: Durée de mise en oeuvre </h3>
				<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
					<table class="min-w-full text-sm border-collapse border border-black">
						<thead>
							<tr>
								<th class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">Durée de mise en oeuvre</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">Description</th>
								{#if (editModeEchellePtr && !readOnlyEchellePtr) || parametrageEditPtr}
									<th class="px-2 py-2 text-center font-semibold text-white bg-yellow-500 border border-black min-w-[120px]">Couleur</th>
									<th class="px-2 py-2 text-center font-semibold text-white bg-yellow-500 border border-black">Actions</th>
								{/if}
							</tr>
						</thead>
						<tbody>
							{#each periodiciteRows as row, i}
								<tr class="border border-black">
									<td class={`px-4 py-2 text-black cell-colored-definition ${getPeriodiciteBg(row.periodicite)}`}>
										<input class="w-full border border-transparent bg-transparent" type="text" bind:value={periodiciteRows[i].periodicite} />
									</td>
									<td class="cell-bg-white px-4 py-2 text-black border border-black bg-white">
										<input class="w-full border border-gray-300 rounded px-2 py-1 text-sm" type="text" bind:value={periodiciteRows[i].duree} />
									</td>
									{#if (editModeEchellePtr && !readOnlyEchellePtr) || parametrageEditPtr}
										<td class="px-2 py-2 border border-black bg-gray-50 align-middle">
											<select class="w-full border border-gray-300 rounded px-1 py-0.5 text-xs" bind:value={periodiciteRows[i].bgColor} on:change={() => saveCustomMethodState()}>
												{#each ECHELLE_PTR_COULEURS as c}
													<option value={c}>{c}</option>
												{/each}
											</select>
										</td>
										<td class="px-2 py-2 border border-black bg-gray-100 text-center">
											<div class="flex gap-1 justify-center">
												<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererPeriodiciteAvant(i)} title="Ajouter avant">↑+</button>
												<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererPeriodiciteApres(i)} title="Ajouter après">↓+</button>
												<button type="button" class="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerPeriodicite(i)} title="Supprimer">✕</button>
											</div>
										</td>
									{/if}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				{#if (editModeEchellePtr && !readOnlyEchellePtr) || parametrageEditPtr}
					<div class="flex gap-2 mt-2">
						<button type="button" class="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700" on:click={ajouterPeriodicite}>+ Ajouter une ligne</button>
						{#if periodiciteRows.length > 1}
							<button type="button" class="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerPeriodicite(periodiciteRows.length - 1)}>- Supprimer la dernière ligne</button>
						{/if}
					</div>
				{/if}
			</section>

			<section class="space-y-4">
				<h3 class="text-lg font-semibold text-gray-900">Table 2&nbsp;: Niveau de complexité</h3>
				<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
					<table class="min-w-full text-sm align-top border-collapse border border-black">
						<thead>
							<tr>
								<th class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">Complexité</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">Définition du niveau de complexité supposé</th>
								{#if (editModeEchellePtr && !readOnlyEchellePtr) || parametrageEditPtr}
									<th class="px-2 py-2 text-center font-semibold text-white bg-yellow-500 border border-black min-w-[120px]">Couleur</th>
									<th class="px-2 py-2 text-center font-semibold text-white bg-yellow-500 border border-black">Actions</th>
								{/if}
							</tr>
						</thead>
						<tbody>
							{#each complexiteRows as row, i}
								<tr class="border border-black">
									<td class={`px-4 py-2 font-medium cell-colored-definition ${getComplexiteBg(row.complexite)}`}>
										<input class="w-full border border-transparent bg-transparent font-medium" type="text" bind:value={complexiteRows[i].complexite} />
									</td>
									<td class="cell-bg-white px-4 py-2 text-black border border-black bg-white">
										<textarea class="w-full border border-gray-300 rounded px-2 py-1 text-sm min-h-[80px]" bind:value={complexiteRows[i].definition}></textarea>
									</td>
									{#if (editModeEchellePtr && !readOnlyEchellePtr) || parametrageEditPtr}
										<td class="px-2 py-2 border border-black bg-gray-50 align-middle">
											<select class="w-full border border-gray-300 rounded px-1 py-0.5 text-xs" bind:value={complexiteRows[i].bgColor} on:change={() => saveCustomMethodState()}>
												{#each ECHELLE_PTR_COULEURS as c}
													<option value={c}>{c}</option>
												{/each}
											</select>
										</td>
										<td class="px-2 py-2 border border-black bg-gray-100 text-center">
											<div class="flex gap-1 justify-center">
												<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererComplexiteAvant(i)} title="Ajouter avant">↑+</button>
												<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererComplexiteApres(i)} title="Ajouter après">↓+</button>
												<button type="button" class="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerComplexite(i)} title="Supprimer">✕</button>
											</div>
										</td>
									{/if}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				{#if (editModeEchellePtr && !readOnlyEchellePtr) || parametrageEditPtr}
					<div class="flex gap-2 mt-2">
						<button type="button" class="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700" on:click={ajouterComplexite}>+ Ajouter une ligne</button>
						{#if complexiteRows.length > 1}
							<button type="button" class="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerComplexite(complexiteRows.length - 1)}>- Supprimer la dernière ligne</button>
						{/if}
					</div>
				{/if}
			</section>

			<section class="space-y-4">
				<h3 class="text-lg font-semibold text-gray-900">Table 3&nbsp;: Type de l'action</h3>
				<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
					<table class="min-w-full text-sm align-top border-collapse border border-black">
						<thead>
							<tr>
								<th class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">Type de l'action</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">Description</th>
								{#if (editModeEchellePtr && !readOnlyEchellePtr) || parametrageEditPtr}
									<th class="px-2 py-2 text-center font-semibold text-white bg-yellow-500 border border-black min-w-[120px]">Couleur</th>
									<th class="px-2 py-2 text-center font-semibold text-white bg-yellow-500 border border-black">Actions</th>
								{/if}
							</tr>
						</thead>
						<tbody>
							{#each typeActionRows as row, i}
								<tr class="border border-black">
									<td class={`px-4 py-2 font-medium cell-colored-definition ${getTypeActionBg(row.type_action)}`}>
										<input class="w-full border border-transparent bg-transparent font-medium" type="text" bind:value={typeActionRows[i].type_action} />
									</td>
									<td class="cell-bg-white px-4 py-2 text-black border border-black bg-white">
										<textarea class="w-full border border-gray-300 rounded px-2 py-1 text-sm min-h-[60px]" bind:value={typeActionRows[i].description}></textarea>
									</td>
									{#if (editModeEchellePtr && !readOnlyEchellePtr) || parametrageEditPtr}
										<td class="px-2 py-2 border border-black bg-gray-50 align-middle">
											<select class="w-full border border-gray-300 rounded px-1 py-0.5 text-xs" bind:value={typeActionRows[i].bgColor} on:change={() => saveCustomMethodState()}>
												{#each ECHELLE_PTR_COULEURS as c}
													<option value={c}>{c}</option>
												{/each}
											</select>
										</td>
										<td class="px-2 py-2 border border-black bg-gray-100 text-center">
											<div class="flex gap-1 justify-center">
												<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererTypeActionAvant(i)} title="Ajouter avant">↑+</button>
												<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererTypeActionApres(i)} title="Ajouter après">↓+</button>
												<button type="button" class="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerTypeAction(i)} title="Supprimer">✕</button>
											</div>
										</td>
									{/if}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				{#if (editModeEchellePtr && !readOnlyEchellePtr) || parametrageEditPtr}
					<div class="flex gap-2 mt-2">
						<button type="button" class="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700" on:click={ajouterTypeAction}>+ Ajouter une ligne</button>
						{#if typeActionRows.length > 1}
							<button type="button" class="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerTypeAction(typeActionRows.length - 1)}>- Supprimer la dernière ligne</button>
						{/if}
					</div>
				{/if}
			</section>

			<section class="space-y-4">
				<h3 class="text-lg font-semibold text-gray-900">Table 4&nbsp;: Priorité de l'action</h3>
				<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
					<table class="min-w-full text-sm border-collapse border border-black">
						<thead>
							<tr>
								<th colspan={5} class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">Priorité de l'action</th>
							</tr>
							<tr>
								<th class="px-4 py-2 text-left font-semibold text-white bg-slate-900 border border-black">Échelle</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-slate-900 border border-black">Définition</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-slate-900 border border-black">Signification (score)</th>
								{#if (editModeEchellePtr && !readOnlyEchellePtr) || parametrageEditPtr}
									<th class="px-2 py-2 text-center font-semibold text-white bg-slate-900 border border-black min-w-[120px]">Couleur</th>
									<th class="px-2 py-2 text-center font-semibold text-white bg-slate-900 border border-black">Actions</th>
								{/if}
							</tr>
						</thead>
						<tbody>
							{#each prioriteRows as row, i}
								<tr class="border border-black">
									<td class="cell-bg-white px-4 py-2 font-medium text-black border border-black bg-white">
										<input class="w-full border border-gray-300 rounded px-2 py-1 text-sm" type="text" bind:value={prioriteRows[i].echelle} />
									</td>
									<td class={`px-4 py-2 cell-colored-definition ${getPrioriteDefinitionBg(row.echelle)}`}>
										<input class="w-full border border-transparent bg-transparent" type="text" bind:value={prioriteRows[i].definition} />
									</td>
									<td class="cell-bg-white px-4 py-2 text-black border border-black bg-white">
										<input class="w-full border border-gray-300 rounded px-2 py-1 text-sm" type="text" bind:value={prioriteRows[i].signification} />
									</td>
									{#if (editModeEchellePtr && !readOnlyEchellePtr) || parametrageEditPtr}
										<td class="px-2 py-2 border border-black bg-gray-50 align-middle">
											<select class="w-full border border-gray-300 rounded px-1 py-0.5 text-xs" bind:value={prioriteRows[i].bgColor} on:change={() => saveCustomMethodState()}>
												{#each ECHELLE_PTR_COULEURS as c}
													<option value={c}>{c}</option>
												{/each}
											</select>
										</td>
										<td class="px-2 py-2 border border-black bg-gray-100 text-center">
											<div class="flex gap-1 justify-center">
												<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererPrioriteAvant(i)} title="Ajouter avant">↑+</button>
												<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererPrioriteApres(i)} title="Ajouter après">↓+</button>
												<button type="button" class="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerPriorite(i)} title="Supprimer">✕</button>
											</div>
										</td>
									{/if}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				{#if (editModeEchellePtr && !readOnlyEchellePtr) || parametrageEditPtr}
					<div class="flex gap-2 mt-2">
						<button type="button" class="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700" on:click={ajouterPriorite}>+ Ajouter une ligne</button>
						{#if prioriteRows.length > 1}
							<button type="button" class="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerPriorite(prioriteRows.length - 1)}>- Supprimer la dernière ligne</button>
						{/if}
					</div>
				{/if}
			</section>
			</section>
		</section>















{:else if activeSection === 'cartographie-risques'}
	<section class="space-y-6">
		<div class="flex items-center justify-between gap-4 flex-wrap">
			<h2 class="text-xl font-semibold text-gray-900">Cartographie des risques</h2>
			<button
				type="button"
				class="px-3 py-1.5 text-sm rounded {editModeCarto
					? 'bg-gray-600 text-white hover:bg-gray-700'
					: 'bg-sky-600 text-white hover:bg-sky-700'}"
				on:click={() => (editModeCarto = !editModeCarto)}>
				{editModeCarto ? 'Terminer la modification' : 'Modifier'}
			</button>
		</div>

		<!-- Tableau de cartographie - Flexible avec hauteur augmentée -->
			<!-- Toolbar: switchable sub-views for cartographie -->
			<div class="flex items-center justify-between mb-2">
				<div class="flex gap-2 items-center flex-wrap">
					<button type="button" class={`px-3 py-1 text-sm rounded-md border ${cartoView==='identification' ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`} on:click={() => (cartoView='identification')}>Identification</button>
					<button type="button" class={`px-3 py-1 text-sm rounded-md border ${cartoView==='brut' ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`} on:click={() => (cartoView='brut')}>Risque Brut</button>
					<button type="button" class={`px-3 py-1 text-sm rounded-md border ${cartoView==='net' ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`} on:click={() => (cartoView='net')}>Degré & Risque Net</button>
					<button type="button" class={`px-3 py-1 text-sm rounded-md border ${cartoView==='ptr' ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`} on:click={() => (cartoView='ptr')}>PTR + Résiduel</button>
					<button type="button" class={`px-3 py-1 text-sm rounded-md border ${cartoView==='all' ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`} on:click={() => (cartoView='all')}>Tout</button>
					<span class="ml-4 pl-4 border-l border-gray-300 text-xs text-gray-600">Version tableau :</span>
					<button type="button" class={`px-3 py-1 text-sm rounded-md border ${cartoVersion==='A' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`} on:click={() => (cartoVersion='A')}>Sans Efficacité</button>
					<button type="button" class={`px-3 py-1 text-sm rounded-md border ${cartoVersion==='B' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`} on:click={() => (cartoVersion='B')}>Avec Efficacité</button>
					<button type="button" class="px-3 py-1 text-sm rounded-md border border-amber-500 bg-amber-50 text-amber-800 hover:bg-amber-100 ml-2" on:click={resetCartoTable}>Réinitialiser le tableau</button>
				</div>
				<p class="text-xs text-gray-500">Affiche uniquement la sous-partie sélectionnée pour une meilleure lisibilité.</p>
			</div>

			<div class="overflow-x-auto rounded-lg border border-black bg-white shadow-sm" class:view-all={cartoView==='all'} class:view-identification={cartoView==='identification'} class:view-brut={cartoView==='brut'} class:view-net={cartoView==='net'} class:view-ptr={cartoView==='ptr'} class:ptr-version-b={cartoView==='ptr' && cartoVersion==='B'} class:net-version-b={cartoView==='net' && cartoVersion==='B'}>
				<table class="min-w-full text-xs border-collapse border border-black" class:carto-version-b-table={cartoView==='all' && cartoVersion==='B'}>
					<!-- Colgroup: 45 colonnes (removed empty Code Risques & F.R), classes par groupe pour masquage via CSS -->
					<colgroup>
						<!-- cols 1-20 : identification (removed 2 empty cols, was 3-22) -->
						<col class="col-identification" />
						<col class="col-identification" />
						<col class="col-identification" />
						<col class="col-identification" />
						<col class="col-identification" />
						<col class="col-identification" />
						<col class="col-identification" />
						<col class="col-identification" />
						<col class="col-identification" />
						<col class="col-identification" />
						<col class="col-identification" />
						<col class="col-identification" />
						<col class="col-identification" />
						<col class="col-identification" />
						<col class="col-identification" />
						<col class="col-identification" />
						<col class="col-identification" />
						<col class="col-identification" />
						<col class="col-identification" />
						<col class="col-identification" />
						<!-- cols 21-36 : risque brut (3 DIC + 1 crit + jusqu'à 8 impacts + 4 gravité/proba/ipc/risque) -->
						<col class="col-brut" />
						<col class="col-brut" />
						<col class="col-brut" />
						<col class="col-brut" />
						<col class="col-brut col-brut-impact" />
						<col class="col-brut col-brut-impact" />
						<col class="col-brut col-brut-impact" />
						<col class="col-brut col-brut-impact" />
						<col class="col-brut col-brut-impact" />
						<col class="col-brut col-brut-impact" />
						<col class="col-brut col-brut-impact" />
						<col class="col-brut col-brut-impact" />
						<col class="col-brut" />
						<col class="col-brut" />
						<col class="col-brut" />
						<col class="col-brut" />
						<!-- cols 33-38 : degré + risque net (was 35-40) -->
						<col class="col-net" />
						<col class="col-net" />
						<col class="col-net" />
						<col class="col-net" />
						<col class="col-net" />
						<col class="col-net" />
						<!-- cols 39-45 : PTR + risque résiduel (was 41-47) -->
						<col class="col-ptr" />
						<col class="col-ptr" />
						<col class="col-ptr" />
						<col class="col-ptr" />
						<col class="col-ptr" />
						<col class="col-ptr" />
						<col class="col-ptr" />
						{#if editModeCarto}
						<col class="col-actions" />
						{/if}
					</colgroup>

					<!-- Dynamic headers per view: hide original thead, show correct headers for each view -->
					{#if cartoView === 'identification'}
						<thead>
							<tr>
								<th colspan="21" class="px-4 py-3 text-center font-bold text-lg text-white bg-teal-700 border border-black">
									IDENTIFICATION DES RISQUES
								</th>
							</tr>
							<tr>
								<th class="px-2 py-3 text-center font-bold text-white bg-gray-600 border border-black">Entité</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-gray-600 border border-black">Domaine / Processus</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-gray-600 border border-black">Activités</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-teal-700 border border-black">Code Risque</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-teal-700 border border-black">Description du scénario</th>
			
								<th class="px-2 py-3 text-center font-bold text-white bg-teal-700 border border-black">ISO 27001</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-teal-700 border border-black">Famille de risque</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-teal-700 border border-black">Source</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-teal-700 border border-black">Famille de causes</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-teal-700 border border-black">Propriétaire du risque</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-red-700 border border-black">Matériel informatique</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-red-700 border border-black">Application</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-red-700 border border-black">Équipements sécurité</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-red-700 border border-black">Équipements réseaux</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-red-700 border border-black">Ressources humaines</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-red-700 border border-black">Document</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-red-700 border border-black">Données</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-green-600 border border-black">D</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-green-600 border border-black">I</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-green-600 border border-black">C</th>
								{#if editModeCarto}
								<th class="px-2 py-3 text-center font-bold text-white bg-gray-600 border border-black min-w-[90px]">Actions</th>
								{/if}
							</tr>
						</thead>
					{:else if cartoView === 'brut'}
						<thead>
							<tr>
								<th colspan={2 + cartoRisqueBrutColspan + (editModeCarto ? 1 : 0)} class="px-4 py-3 text-center font-bold text-lg text-black bg-yellow-400 border border-black">
									RISQUE BRUT - ÉVALUATION DE LA CRITICITÉ
								</th>
							</tr>
							<tr>
								<th class="px-2 py-3 text-center font-bold text-white bg-teal-700 border border-black">Code Risque</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-teal-700 border border-black">Description du scénario</th>
								<th class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black">Impact disponibilité</th>
								<th class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black">Impact intégrité </th>
								<th class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black">Impact confidentialité</th>
								<th class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black">Criticité actif</th>
								{#each impactDefinitionsRows as imp}
									<th class="px-2 py-3 text-center font-bold text-white bg-orange-600 border border-black col-brut-impact" style="min-width: 90px;">{imp.libelle || 'Impact'}</th>
								{/each}
								<th class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black">Gravité des impacts</th>
								<th class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black">Probabilité</th>
								<th class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black">I*P*C</th>
								<th class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black">Risque Brut</th>
								{#if editModeCarto}
								<th class="px-2 py-3 text-center font-bold text-white bg-gray-600 border border-black min-w-[90px]">Actions</th>
								{/if}
							</tr>
						</thead>
					{:else if cartoView === 'net'}
						<thead>
							<tr>
								<th colspan={cartoVersion === 'B' ? 8 : 9} class="px-4 py-3 text-center font-bold text-lg text-white bg-teal-600 border border-black">
									DEGRÉ D'EXPOSITION + RISQUE NET {#if cartoVersion === 'B'}(Avec Efficacité){/if}
								</th>
							</tr>
							<tr>
								<th class="px-2 py-3 text-center font-bold text-white bg-teal-700 border border-black">Code Risque</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-teal-700 border border-black">Description du scénario</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-teal-700 border border-black">Dispositif de Maîtrise</th>
								{#if cartoVersion === 'A'}
									<th class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black">Criticité actif</th>
									<th class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black">Gravité des impacts</th>
									<th class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black">Probabilité</th>
									<th class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black">I*P*C</th>
									<th class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black">Risque Net</th>
								{:else}
									<th class="carto-b-th px-1 py-1 text-center font-bold text-black bg-yellow-400 border border-black text-xs" style="width: 130px; max-width: 130px;">Efficacité DMR</th>
									<th class="carto-b-th px-1 py-1 text-center font-bold text-black bg-yellow-400 border border-black text-xs" style="width: 130px; max-width: 130px;">Niveau d'efficacité</th>
									<th class="carto-b-th px-1 py-1 text-center font-bold text-black bg-yellow-400 border border-black text-xs" style="width: 130px; max-width: 130px;">Niveau de risque</th>
									<th class="carto-b-th px-1 py-1 text-center font-bold text-black bg-yellow-400 border border-black text-xs" style="width: 130px; max-width: 130px;">Signification du risque net</th>
								{/if}
								{#if editModeCarto}
								<th class="px-2 py-3 text-center font-bold text-white bg-gray-600 border border-black min-w-[90px]">Actions</th>
								{/if}
							</tr>
						</thead>
					{:else if cartoView === 'ptr'}
						<thead>
							<tr>
								<th colspan="10" class="px-4 py-3 text-center font-bold text-lg text-white bg-gray-600 border border-black">
									PLAN DE TRAITEMENT + RISQUE RÉSIDUEL {#if cartoVersion === 'B'}(Avec Efficacité){/if}
								</th>
							</tr>
							<tr>
								<th class="px-2 py-3 text-center font-bold text-white bg-gray-600 border border-black">Code Risque</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-gray-600 border border-black">Description du scénario</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-gray-600 border border-black">Décision</th>
								<th class="px-2 py-3 text-center font-bold text-white bg-gray-600 border border-black">Action PTR</th>
								{#if cartoVersion === 'A'}
									<th class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black">Criticité actif</th>
									<th class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black">Gravité des impacts</th>
									<th class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black">Probabilité d'occurrence</th>
									<th class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black">I*P*C</th>
									<th class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black">Risque Résiduel</th>
								{:else}
									<th class="carto-b-th px-1 py-1 text-center font-bold text-black bg-yellow-400 border border-black text-xs" style="width: 130px; max-width: 130px;">Efficacité PTR</th>
									<th class="carto-b-th px-1 py-1 text-center font-bold text-black bg-yellow-400 border border-black text-xs" style="width: 130px; max-width: 130px;">Pourcentage d'efficacité</th>
									<th class="carto-b-th px-1 py-1 text-center font-bold text-black bg-yellow-400 border border-black text-xs" style="width: 130px; max-width: 130px;">Niveau de risque</th>
									<th class="carto-b-th px-1 py-1 text-center font-bold text-black bg-yellow-400 border border-black text-xs" style="width: 130px; max-width: 130px;">Niveau du risque résiduel</th>
								{/if}
								{#if editModeCarto}
								<th class="px-2 py-3 text-center font-bold text-white bg-gray-600 border border-black min-w-[90px]">Actions</th>
								{/if}
							</tr>
						</thead>
					{:else}
						<!-- View 'all': show original complex headers (hidden by default, shown when cartoView === 'all') -->
						<thead style="display: none;">
							<tr>
								<th colspan={cartoTotalCols} class="px-4 py-3 text-center font-bold text-lg text-black border border-black bg-white">
									CARTOGRAPHIE DES RISQUES DE SECURITÉ DES SYSTÈMES D'INFORMATION
								</th>
							</tr>
						</thead>
					{/if}

					<!-- Old complex headers (show only when cartoView==='all') -->
					{#if cartoView === 'all'}
					<thead>
					<!-- Ligne 1: Titre principal -->
					<tr>
						<th colspan={cartoTotalCols} class="px-4 py-3 text-center font-bold text-lg text-black border border-black bg-white">
							CARTOGRAPHIE DES RISQUES DE SECURITÉ DES SYSTÈMES D'INFORMATION
						</th>
					</tr>
					
					<!-- Ligne 5: Sections principales (regroupement Version B cohérent ; colspans dynamiques si impacts ajoutés/supprimés) -->
					<tr>
						<th colspan="3" class="px-2 py-3 text-center font-bold text-black bg-white border border-black">
							Cartographie des Processus
						</th>
						<th colspan="17" class="px-2 py-3 text-center font-bold text-white bg-teal-700 border border-black">
							Identification des risques inhérents
						</th>
						<th colspan={cartoRisqueBrutColspan} class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black">
							Évaluation de la Criticité du Risque Brut
						</th>
						<th class="px-2 py-3 text-center font-bold text-white bg-teal-600 border border-black">
							Détermination du degré d'exposition aux risques
						</th>
						<th colspan={cartoVersion === 'B' ? 4 : 5} class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black" style="min-width: 520px;">
							Évaluation de la Criticité du Risque Net
						</th>
						<th colspan="2" class="px-2 py-3 text-center font-bold text-white bg-gray-600 border border-black">
							Plan de traitement des risques (PTR)
						</th>
						<th colspan={cartoVersion === 'B' ? 4 : 5} class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black" style="min-width: 520px;">
							Évaluation du Risque Résiduel
						</th>
						{#if editModeCarto}
						<th class="px-2 py-3 text-center font-bold text-white bg-gray-600 border border-black">
							Actions
						</th>
						{/if}
					</tr>
					
					<!-- Ligne 6-7: Headers détaillés -->
					<tr>
						
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-white bg-gray-600 border border-black" style="min-width: 80px;">
							Entité
						</th>
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-white bg-gray-600 border border-black" style="min-width: 150px;">
							Domaine / Processus
						</th>
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-white bg-gray-600 border border-black" style="min-width: 180px;">
							Activités
						</th>
						
						<!-- Identification risques -->
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-white bg-teal-700 border border-black" style="min-width: 100px;">
							Code<br/>Risque
						</th>
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-white bg-teal-700 border border-black" style="min-width: 200px;">
							Description du scénario du Risque
						</th>
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-white bg-teal-700 border border-black" style="min-width: 100px;">
							Mesure ISO27001, annexe A
						</th>
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-white bg-teal-700 border border-black" style="min-width: 120px;">
							Famille<br/>de risque
						</th>
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-white bg-teal-700 border border-black" style="min-width: 100px;">
							Source
						</th>
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-white bg-teal-700 border border-black" style="min-width: 140px;">
							Famille de causes
						</th>
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-white bg-teal-700 border border-black" style="min-width: 100px;">
							Propriétaire<br/>du risque
						</th>
						
						<!-- Catégories d'actifs -->
						<th colspan="7" class="px-2 py-3 text-center font-bold text-white bg-red-700 border border-black">
							Catégorie d'actifs informationnels directement concernés
						</th>
						
						<!-- Critères d'impact -->
						<th colspan="3" class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black">
							Critères d'impact
						</th>
						
						<!-- Impact DIC -->
						<th colspan="3" class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black">
							Impact DIC
						</th>
						
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black" style="min-width: 100px;">
							Criticité de l'actif - Besoin en SSI
						</th>
						{#each impactDefinitionsRows as imp}
							<th rowspan="2" class="px-2 py-3 text-center font-bold text-white bg-orange-600 border border-black" style="min-width: 80px;">{imp.libelle || 'Impact'}</th>
						{/each}
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black" style="min-width: 80px;">
							Gravité des impacts
						</th>
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black" style="min-width: 80px;">
							Probabilité d'Occurrence
						</th>
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black" style="min-width: 70px;">
							I*P*C
						</th>
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black" style="min-width: 100px;">
							Signification du risque brut
						</th>
						
						<!-- Détermination du degré d'exposition : DMR -->
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-white bg-teal-700 border border-black" style="min-width: 200px;">
							Description du Dispositif de Maitrise des Risques (DMR) existant
						</th>
						
						<!-- Évaluation de la Criticité du Risque Net -->
						{#if cartoVersion === 'A'}
							<th rowspan="2" class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black" style="min-width: 120px;">Criticité de l'actif - Besoin en SSI</th>
							<th rowspan="2" class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black" style="min-width: 95px;">Gravité des impacts</th>
							<th rowspan="2" class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black" style="min-width: 95px;">Probabilité<br/>d'Occurrence</th>
							<th rowspan="2" class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black" style="min-width: 85px;">I*P*C</th>
							<th rowspan="2" class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black" style="min-width: 120px;">Signification du risque net</th>
						{:else}
							<th rowspan="2" class="carto-b-th px-1 py-1 text-center font-bold text-black bg-yellow-400 border border-black text-xs whitespace-nowrap" style="width: 130px; max-width: 130px;">Efficacité DMR</th>
							<th rowspan="2" class="carto-b-th px-1 py-1 text-center font-bold text-black bg-yellow-400 border border-black text-xs" style="width: 130px; max-width: 130px;">Niveau d'efficacité</th>
							<th rowspan="2" class="carto-b-th px-1 py-1 text-center font-bold text-black bg-yellow-400 border border-black text-xs" style="width: 130px; max-width: 130px;">Niveau de risque</th>
							<th rowspan="2" class="carto-b-th px-1 py-1 text-center font-bold text-black bg-yellow-400 border border-black text-xs" style="width: 130px; max-width: 130px;">Signification du risque net</th>
						{/if}
						<!-- Plan de traitement des risques (PTR) -->
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-white bg-gray-600 border border-black" style="min-width: 100px;">Décision</th>
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-white bg-gray-600 border border-black" style="min-width: 200px;">Action à mettre en place</th>
						<!-- Évaluation du Risque Résiduel -->
						{#if cartoVersion === 'A'}
							<th rowspan="2" class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black" style="min-width: 120px;">Criticité de l'actif - Besoin en SSI</th>
							<th rowspan="2" class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black" style="min-width: 85px;">Gravité des impacts</th>
							<th rowspan="2" class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black" style="min-width: 95px;">Probabilité d'occurrence</th>
							<th rowspan="2" class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black" style="min-width: 85px;">I*P*C</th>
							<th rowspan="2" class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black" style="min-width: 120px;">Niveau du risque résiduel</th>
						{:else}
							<th rowspan="2" class="carto-b-th px-1 py-1 text-center font-bold text-black bg-yellow-400 border border-black text-xs" style="width: 130px; max-width: 130px;">Efficacité PTR</th>
							<th rowspan="2" class="carto-b-th px-1 py-1 text-center font-bold text-black bg-yellow-400 border border-black text-xs" style="width: 130px; max-width: 130px;">Pourcentage d'efficacité</th>
							<th rowspan="2" class="carto-b-th px-1 py-1 text-center font-bold text-black bg-yellow-400 border border-black text-xs" style="width: 130px; max-width: 130px;">Niveau de risque</th>
							<th rowspan="2" class="carto-b-th px-1 py-1 text-center font-bold text-black bg-yellow-400 border border-black text-xs" style="width: 130px; max-width: 130px;">Niveau du risque résiduel</th>
						{/if}
						{#if editModeCarto}
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-white bg-gray-600 border border-black" style="min-width: 90px;">
							Actions
						</th>
						{/if}
					</tr>
					
					<!-- Ligne 7: Sous-headers catégories actifs + DIC -->
					<tr>
						<!-- Catégories actifs -->
						<th class="px-2 py-3 text-center font-bold text-white bg-cyan-600 border border-black" style="min-width: 70px;">
							Matériel informatique
						</th>
						<th class="px-2 py-3 text-center font-bold text-white bg-cyan-600 border border-black" style="min-width: 70px;">
							Application
						</th>
						<th class="px-2 py-3 text-center font-bold text-white bg-cyan-600 border border-black" style="min-width: 70px;">
							Equipements sécurité
						</th>
						<th class="px-2 py-3 text-center font-bold text-white bg-cyan-600 border border-black" style="min-width: 70px;">
							Equipements réseaux
						</th>
						<th class="px-2 py-3 text-center font-bold text-white bg-cyan-600 border border-black" style="min-width: 70px;">
							Ressources humaines
						</th>
						<th class="px-2 py-3 text-center font-bold text-white bg-cyan-600 border border-black" style="min-width: 70px;">
							Document
						</th>
						<th class="px-2 py-3 text-center font-bold text-white bg-cyan-600 border border-black" style="min-width: 70px;">
							Données
						</th>
						
						<!-- Critères impact -->
						<th class="px-2 py-3 text-center font-bold text-white bg-green-600 border border-black" style="min-width: 40px;">
							D
						</th>
						<th class="px-2 py-3 text-center font-bold text-white bg-green-600 border border-black" style="min-width: 40px;">
							I
						</th>
						<th class="px-2 py-3 text-center font-bold text-white bg-green-600 border border-black" style="min-width: 40px;">
							C
						</th>
						
						<!-- Impact DIC -->
						<th class="px-2 py-3 text-center font-bold text-white bg-orange-600 border border-black" style="min-width: 56px;">
							D
						</th>
						<th class="px-2 py-3 text-center font-bold text-white bg-orange-600 border border-black" style="min-width: 56px;">
							I
						</th>
						<th class="px-2 py-3 text-center font-bold text-white bg-orange-600 border border-black" style="min-width: 56px;">
							C
						</th>
					</tr>
				</thead>
				{/if}
				
				<tbody>
					<!-- En-tête sous-groupe 1 : Sinistres physiques / Evènements naturels / Perturbations dues aux rayonnements (codes DSI-R-SP-001 à SP-005) -->
					{#each cartoRows as row, i}
						{@const part = getPartFromCodeRisque(row.codeRisque) || (i > 0 ? getPartFromCodeRisque(cartoRows[i - 1].codeRisque) : 1) || 1}
						{@const prevPart = i > 0 ? (getPartFromCodeRisque(cartoRows[i - 1].codeRisque) || 1) : 0}
						{#if part !== prevPart}
							<tr class="bg-teal-700 carto-part-header">
								<td colspan={cartoTotalCols} class="px-3 py-3 font-bold text-white border border-black">{CARTO_PART_TITLES[part] || 'Autres'}</td>
							</tr>
						{/if}
					<tr class="hover:bg-gray-50">
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4" bind:value={row.entite} on:blur={() => saveCustomMethodState()}></textarea>
						</td>
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4" bind:value={row.domaineProcessus} on:blur={() => saveCustomMethodState()}></textarea>
						</td>
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4" bind:value={row.activites} on:blur={() => saveCustomMethodState()}></textarea>
						</td>
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4" bind:value={row.codeRisque} on:blur={() => saveCustomMethodState()}></textarea>
						</td>
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" bind:value={row.descriptionScenario} on:blur={() => saveCustomMethodState()}></textarea>
						</td>
						<td class="px-2 py-2 border border-black bg-white align-top" title={getIso27001ControlTooltip(row.mesureISO)}>
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4" bind:value={row.mesureISO} on:blur={() => saveCustomMethodState()} title={getIso27001ControlTooltip(row.mesureISO)}></textarea>
						</td>
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4" bind:value={row.familleRisque} on:blur={() => saveCustomMethodState()}></textarea>
						</td>
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4" bind:value={row.source} on:blur={() => saveCustomMethodState()}></textarea>
						</td>
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="4" bind:value={row.familleCauses} on:blur={() => saveCustomMethodState()}></textarea>
						</td>
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4" bind:value={row.proprietaireRisque} on:blur={() => saveCustomMethodState()}></textarea>
						</td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" bind:checked={row.actifMateriel} on:change={() => recalcImpactDICForCartoRow(i)} /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" bind:checked={row.actifApplication} on:change={() => recalcImpactDICForCartoRow(i)} /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" bind:checked={row.actifEquipementsSecurite} on:change={() => recalcImpactDICForCartoRow(i)} /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" bind:checked={row.actifEquipementsReseaux} on:change={() => recalcImpactDICForCartoRow(i)} /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" bind:checked={row.actifRessourcesHumaines} on:change={() => recalcImpactDICForCartoRow(i)} /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" bind:checked={row.actifDocument} on:change={() => recalcImpactDICForCartoRow(i)} /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" bind:checked={row.actifDonnees} on:change={() => recalcImpactDICForCartoRow(i)} /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" bind:checked={row.dicD} on:change={() => recalcImpactDICForCartoRow(i)} /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" bind:checked={row.dicI} on:change={() => recalcImpactDICForCartoRow(i)} /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" bind:checked={row.dicC} on:change={() => recalcImpactDICForCartoRow(i)} /></td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<span class="inline-block min-w-[2rem] text-xs font-medium">{row.dicD ? (row.impactD ?? '—') : '—'}</span>
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<span class="inline-block min-w-[2rem] text-xs font-medium">{row.dicI ? (row.impactI ?? '—') : '—'}</span>
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<span class="inline-block min-w-[2rem] text-xs font-medium">{row.dicC ? (row.impactC ?? '—') : '—'}</span>
						</td>
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">{getCriticite(row) ?? '-'}</td>
						{#each impactDefinitionsRows as imp, idx}
							<td class="px-2 py-2 border border-black bg-white align-middle col-brut-impact">
								<select class="w-full text-xs p-1 text-center min-w-[2rem]" value={getRowImpacts(row)[idx]} on:change={(e) => { const v = (e.target as HTMLSelectElement).value; if (!row.impacts || row.impacts.length !== impactDefinitionsRows.length) row.impacts = getRowImpacts(row); row.impacts[idx] = v; saveCustomMethodState(); }}>
									<option value="">--</option>
									{#each impactRows as ir}
										<option value={ir.echelle}>{ir.echelle} – {ir.definition}</option>
									{/each}
								</select>
							</td>
						{/each}
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">{getGravite(row) ?? '-'}</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<select class="w-full text-xs p-1 text-center" value={row.probabilite} on:change={(e) => { row.probabilite = (e.target as HTMLSelectElement).value; saveCustomMethodState(); }}>
								<option value="">--</option>
								{#each probaRows as pr}
									<option value={pr.echelle}>{pr.echelle} – {pr.definition}</option>
								{/each}
							</select>
						</td>
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">{getIpcBrut(row) ?? '-'}</td>
						<td class="px-2 py-2 text-center font-bold border border-black text-xs align-middle {getNiveauRisqueBg(getNiveauBrut(row))}">{getNiveauBrut(row)}</td>
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Description du dispositif..." bind:value={row.dispositifMaitrise} on:blur={() => saveCustomMethodState()}></textarea>
						</td>
						{#if cartoVersion === 'A'}
							<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">{getCriticite(row) ?? '-'}</td>
							<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
								<select class="w-full text-xs p-1 text-center bg-transparent" value={row.graviteNet} on:change={(e) => { row.graviteNet = (e.target as HTMLSelectElement).value; saveCustomMethodState(); }}>
									<option value="">--</option>
									{#each impactRows as ir}
										<option value={ir.echelle}>{ir.echelle} – {ir.definition}</option>
									{/each}
								</select>
							</td>
							<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
								<select class="w-full text-xs p-1 text-center bg-transparent" value={row.probabiliteNet} on:change={(e) => { row.probabiliteNet = (e.target as HTMLSelectElement).value; saveCustomMethodState(); }}>
									<option value="">--</option>
									{#each probaRows as pr}
										<option value={pr.echelle}>{pr.echelle} – {pr.definition}</option>
									{/each}
								</select>
							</td>
							<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">{getIpcNet(row) ?? '-'}</td>
							<td class="px-2 py-2 text-center font-bold border border-black text-xs align-middle {getNiveauRisqueBg(getNiveauNet(row))}">{getNiveauNet(row)}</td>
						{:else}
							<!-- AJ : Efficacité DMR (liste déroulante depuis Aide-Risque) -->
							<td class="carto-b-cell px-1 py-3 border border-black bg-white align-middle" style="width: 130px; max-width: 130px;">
								<select class="w-full text-xs p-1 max-w-[110px] mx-auto" value={row.efficaciteDMR} on:change={(e) => { row.efficaciteDMR = (e.target as HTMLSelectElement).value; saveCustomMethodState(); }}>
									<option value="">--</option>
									{#each efficaciteRows as eff}
										<option value={eff.niveau}>{eff.niveau} – {eff.signification}</option>
									{/each}
								</select>
							</td>
							<!-- AK : Niveau d'efficacité (calculé : Insuffisant, Faible, Acceptable, Efficace, Exemplaire) -->
							<td class="carto-b-cell px-1 py-3 text-center font-bold border border-black bg-yellow-200 align-middle text-xs" style="width: 130px; max-width: 130px;">{getNiveauEfficaciteLabel(row.efficaciteDMR) || '-'}</td>
							<!-- AL : Niveau de risque net (calculé = (1-taux_DMR)×Risque_Brut) -->
							<td class="carto-b-cell px-1 py-3 text-center font-bold border border-black bg-orange-200 align-middle text-xs" style="width: 130px; max-width: 130px;">{formatNiveauRisqueNetBDisplay(row)}</td>
							<!-- AM : Signification du risque net (calculée depuis AL, seuils ≤20 / ]20-36] / ]36-60] / >60) -->
							<td class="carto-b-cell px-1 py-3 text-center font-bold border border-black text-xs align-middle {getNiveauRisqueBg(getSignificationRisqueNetB(row))}" style="width: 130px; max-width: 130px;">{getSignificationRisqueNetB(row)}</td>
						{/if}
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<select class="w-full text-xs p-1" bind:value={row.decision} on:change={() => saveCustomMethodState()}>
								<option value="">--</option>
								<option value="Accepter">Accepter</option>
								<option value="Réduire">Réduire</option>
								<option value="Transférer">Transférer</option>
								<option value="Éviter">Éviter</option>
							</select>
						</td>
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Action... (une ligne = une action PTR)" bind:value={row.actionPTR} on:blur={() => { syncPtrFromCartographie(); saveCustomMethodState(); }}></textarea>
						</td>
						{#if cartoVersion === 'A'}
							<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">{getCriticite(row) ?? '-'}</td>
							<td class="px-2 py-2 border border-black bg-white align-middle">
								<select class="w-full text-xs p-1 text-center" value={row.impactResiduel} on:change={(e) => { row.impactResiduel = (e.target as HTMLSelectElement).value; saveCustomMethodState(); }}>
									<option value="">--</option>
									{#each impactRows as ir}
										<option value={ir.echelle}>{ir.echelle} – {ir.definition}</option>
									{/each}
								</select>
							</td>
							<td class="px-2 py-2 border border-black bg-white align-middle">
								<select class="w-full text-xs p-1 text-center" value={row.vraisemblanceResiduel} on:change={(e) => { row.vraisemblanceResiduel = (e.target as HTMLSelectElement).value; saveCustomMethodState(); }}>
									<option value="">--</option>
									{#each probaRows as pr}
										<option value={pr.echelle}>{pr.echelle} – {pr.definition}</option>
									{/each}
								</select>
							</td>
							<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">{getIpcResiduel(row) ?? '-'}</td>
							<td class="px-2 py-2 text-center font-bold border border-black text-xs align-middle {getNiveauRisqueBg(getNiveauResiduel(row))}">{getNiveauResiduel(row)}</td>
						{:else}
							<!-- AP : Efficacité PTR (sélection niveau 1-5) -->
							<td class="carto-b-cell px-1 py-3 border border-black bg-white align-middle" style="width: 130px; max-width: 130px;">
								<select class="w-full text-xs p-1 max-w-[110px]" bind:value={row.efficacitePTR} on:change={() => saveCustomMethodState()}>
									<option value="">--</option>
									{#each efficaciteRows as eff}
										<option value={eff.niveau}>{eff.niveau} – {eff.signification}</option>
									{/each}
								</select>
							</td>
							<!-- AQ : Niveau d'efficacité PTR (libellé : Insuffisant, Faible, Acceptable, Efficace, Exemplaire) -->
							<td class="carto-b-cell px-1 py-3 text-center font-bold border border-black bg-yellow-200 align-middle text-xs" style="width: 130px; max-width: 130px;">{getSignificationEfficacitePTRDisplay(row.efficacitePTR)}</td>
							<!-- AR : Niveau de risque résiduel (calculé = (1-taux_PTR)×Risque_Net_B) -->
							<td class="carto-b-cell px-1 py-3 text-center font-bold border border-black bg-orange-200 align-middle text-xs" style="width: 130px; max-width: 130px;">{formatNiveauRisqueResiduelBDisplay(row)}</td>
							<!-- AS : Niveau du risque résiduel (calculé depuis AR, mêmes seuils que AM) -->
							<td class="carto-b-cell px-1 py-3 text-center font-bold border border-black text-xs align-middle {getNiveauRisqueBg(getNiveauFromIpc(getNiveauRisqueResiduelB(row)))}" style="width: 130px; max-width: 130px;">{getNiveauFromIpc(getNiveauRisqueResiduelB(row))}</td>
						{/if}
						{#if editModeCarto}
						<td class="px-2 py-2 border border-black bg-gray-100 text-center">
							<div class="flex gap-1 justify-center flex-wrap">
								<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererLigneCartoAvant(i)} title="Ajouter avant">↑+</button>
								<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererLigneCartoApres(i)} title="Ajouter après">↓+</button>
								<button type="button" class="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerLigneCarto(i)} title="Supprimer" disabled={cartoRows.length <= 1}>✕</button>
							</div>
						</td>
						{/if}
					</tr>
					{/each}
						</tbody>
					</table>
				</div>
				{#if editModeCarto}
				<div class="flex gap-2 mt-2">
					<button
						type="button"
						class="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700"
						on:click={ajouterLigneCarto}
					>
						+ Ajouter une ligne
					</button>
					{#if cartoRows.length > 1}
						<button
							type="button"
							class="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700"
							on:click={() => supprimerLigneCarto(cartoRows.length - 1)}
						>
							- Supprimer la dernière ligne
						</button>
					{/if}
				</div>
				{/if}
		</section>
	{:else if activeSection === 'aide-risque'}
		<section class="space-y-8 pb-24 overflow-visible {readOnlyAideRisque ? 'readonly-scales-section' : ''}">
			<div class="flex items-center justify-between gap-4 flex-wrap">
				<h2 class="text-xl font-semibold text-gray-900">Aide-Risque</h2>
				{#if readOnlyAideRisque}
					<p class="text-sm text-gray-500">Affichage des échelles. Pour modifier, utilisez l'onglet <strong>Paramétrage</strong>.</p>
				{:else}
					<button
						type="button"
						class="px-3 py-1.5 text-sm rounded {editModeAideRisque
							? 'bg-amber-600 text-white border border-amber-600'
							: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}"
						on:click={() => {
							if (!editModeAideRisque) {
								probaRows = probaRows.map((r) => ({ ...r, bgColor: r.bgColor ?? getProbaDefBg(r.definition) }));
								impactRows = impactRows.map((r) => ({ ...r, bgColor: r.bgColor ?? getImpactDefBg(r.definition) }));
								frequenceRisqueRows = frequenceRisqueRows.map((r) => ({ ...r, bgColor: (r as Row & { bgColor?: string }).bgColor ?? getFrequenceDefBg(r.definition ?? '') }));
								efficaciteRows = efficaciteRows.map((r) => ({ ...r, bgColor: r.bgColor ?? getEfficaciteDefBg(r.signification) }));
							}
							editModeAideRisque = !editModeAideRisque;
						}}
					>
						{editModeAideRisque ? 'Terminer la modification' : 'Modifier'}
					</button>
				{/if}
			</div>

			<!-- Tableau 1 – Échelle de probabilité / fréquence -->
			<section class="space-y-3">
				<h3 class="text-lg font-semibold text-gray-900">
					Tableau 1&nbsp;: Échelle de probabilité / fréquence
				</h3>
				<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
					<table class="min-w-full text-sm border-collapse border border-black">
						<thead>
							<tr>
								<th class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">Échelle</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">Définition</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">Fréquence</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">Désignation de la probabilité</th>
								{#if editModeAideRisque && !readOnlyAideRisque}
									<th class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">Couleur</th>
									<th class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">Actions</th>
								{/if}
							</tr>
						</thead>
						<tbody>
							{#each probaRows as row, i}
								<tr class="border border-black">
									<td class="cell-bg-white px-4 py-2 text-black border border-black bg-white">
										<input class="w-full border border-gray-300 rounded px-2 py-1 text-sm" type="text" bind:value={probaRows[i].echelle} />
									</td>
									<td class={`px-4 py-2 cell-colored-definition ${getProbaRowBg(row)}`}>
										<input class="w-full border border-transparent bg-transparent font-semibold" type="text" bind:value={probaRows[i].definition} />
									</td>
									<td class="cell-bg-white px-4 py-2 text-black border border-black bg-white align-top">
										<textarea class="w-full border border-gray-300 rounded px-2 py-1 text-xs min-h-[60px]" bind:value={probaRows[i].frequence}></textarea>
									</td>
									<td class="cell-bg-white px-4 py-2 text-black border border-black bg-white align-top">
										<textarea class="w-full border border-gray-300 rounded px-2 py-1 text-xs min-h-[60px]" bind:value={probaRows[i].historique}></textarea>
									</td>
									{#if editModeAideRisque && !readOnlyAideRisque}
										<td class="px-2 py-2 border border-black bg-gray-100">
											<select class="w-full text-xs rounded border border-gray-300 px-1 py-1" bind:value={probaRows[i].bgColor} on:change={() => saveCustomMethodState()}>
												{#each AIDE_RISQUE_COULEURS as c}
													<option value={c}>{c.replace('bg-', '').replace(' text-', ' / ')}</option>
												{/each}
											</select>
										</td>
										<td class="px-4 py-2 border border-black bg-gray-100 text-center">
											<div class="flex gap-1 justify-center flex-wrap">
												<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererProbaAvant(i)} title="Ajouter avant">↑+</button>
												<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererProbaApres(i)} title="Ajouter après">↓+</button>
												<button type="button" class="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerProba(i)} title="Supprimer" disabled={probaRows.length <= 1}>✕</button>
											</div>
										</td>
									{/if}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				{#if editModeAideRisque && !readOnlyAideRisque}
					<div class="flex gap-2 mt-2">
						<button type="button" class="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700" on:click={ajouterProba}>+ Ajouter une ligne</button>
						{#if probaRows.length > 1}
							<button type="button" class="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerProba(probaRows.length - 1)}>- Supprimer la dernière ligne</button>
						{/if}
					</div>
				{/if}
			</section>

			<!-- Critères d'impact (définit les types d'impacts ; affiché avant le Tableau 2 pour enchaîner logiquement) -->
			<section class="space-y-3">
				<h3 class="text-lg font-semibold text-gray-900">Critères d'impact</h3>
				<p class="text-sm text-gray-600">
					Ce tableau définit les types d'impacts utilisés dans l'évaluation de la criticité du risque brut. Les libellés et définitions sont repris dans la cartographie des risques (colonnes Impact). Modifier ce tableau ajoute ou supprime des colonnes dans la cartographie et dans le Tableau 2 ci‑dessous.
				</p>
				<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
					<table class="min-w-full text-sm border-collapse border border-black">
						<thead>
							<tr>
								<th class="px-4 py-2 text-left font-semibold text-white bg-orange-600 border border-black">Libellé (Impact)</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-orange-600 border border-black">Définition</th>
								{#if editModeAideRisque && !readOnlyAideRisque}
									<th class="px-4 py-2 text-center font-semibold text-white bg-orange-600 border border-black">Actions</th>
								{/if}
							</tr>
						</thead>
						<tbody>
							{#each impactDefinitionsRows as def, i}
								<tr class="border border-black">
									<td class="cell-bg-white px-4 py-2 text-black border border-black bg-white">
										<input class="w-full border border-gray-300 rounded px-2 py-1 text-sm" type="text" bind:value={impactDefinitionsRows[i].libelle} placeholder="Ex. Impact Financier" on:change={() => saveCustomMethodState()} />
									</td>
									<td class="cell-bg-white px-4 py-2 text-black border border-black bg-white align-top">
										<textarea class="w-full border border-gray-300 rounded px-2 py-1 text-xs min-h-[60px]" bind:value={impactDefinitionsRows[i].definition} placeholder="Explication de l'impact..." on:blur={() => saveCustomMethodState()}></textarea>
									</td>
									{#if editModeAideRisque && !readOnlyAideRisque}
										<td class="px-4 py-2 border border-black bg-gray-100 text-center">
											<div class="flex gap-1 justify-center flex-wrap">
												<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => { impactDefinitionsRows = insererLigneAvant(impactDefinitionsRows, i, { libelle: '', definition: '' }); syncCartoRowsImpacts(); syncImpactRowsCriteres(); saveCustomMethodState(); }} title="Ajouter avant">↑+</button>
												<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => { impactDefinitionsRows = insererLigneApres(impactDefinitionsRows, i, { libelle: '', definition: '' }); syncCartoRowsImpacts(); syncImpactRowsCriteres(); saveCustomMethodState(); }} title="Ajouter après">↓+</button>
												<button type="button" class="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerDefinitionImpact(i)} title="Supprimer" disabled={impactDefinitionsRows.length <= 1}>✕</button>
											</div>
										</td>
									{/if}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				{#if editModeAideRisque && !readOnlyAideRisque}
					<div class="flex gap-2 mt-2">
						<button type="button" class="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700" on:click={ajouterDefinitionImpact}>+ Ajouter une ligne</button>
						{#if impactDefinitionsRows.length > 1}
							<button type="button" class="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerDefinitionImpact(impactDefinitionsRows.length - 1)}>- Supprimer la dernière ligne</button>
						{/if}
					</div>
				{/if}
			</section>

			<!-- Tableau 2 – Échelle d'impact (colonnes = critères d'impact, synchronisées avec le tableau Critères d'impact ci‑dessus) -->
			<section class="space-y-3">
				<h3 class="text-lg font-semibold text-gray-900">Tableau 2&nbsp;: Échelle d'impact</h3>
				<p class="text-xs text-gray-600">
					Les colonnes d'impact sont synchronisées avec le tableau «&nbsp;Critères d'impact&nbsp;» ci‑dessus&nbsp;: ajouter un critère ajoute une colonne ici (données par niveau à renseigner ou «&nbsp;À déterminer&nbsp;»).
				</p>
				<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
					<table class="min-w-full text-sm border-collapse border border-black">
						<thead>
							<tr>
								<th class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">Échelle</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">Définition</th>
								{#each impactDefinitionsRows as def}
									<th class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">{def.libelle || 'Critère'}</th>
								{/each}
								{#if editModeAideRisque && !readOnlyAideRisque}
									<th class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">Couleur</th>
									<th class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">Actions</th>
								{/if}
							</tr>
						</thead>
						<tbody>
							{#each impactRows as row, i}
								{@const criteres = getImpactRowCriteres(row)}
								<tr class="border border-black">
									<td class="cell-bg-white px-4 py-2 text-black border border-black bg-white">
										<input class="w-full border border-gray-300 rounded px-2 py-1 text-sm" type="text" bind:value={impactRows[i].echelle} />
									</td>
									<td class={`px-4 py-2 cell-colored-definition ${getImpactRowBg(row)}`}>
										<input class="w-full border border-transparent bg-transparent font-semibold" type="text" bind:value={impactRows[i].definition} />
									</td>
									{#each impactDefinitionsRows as def, idx}
										<td class="cell-bg-white px-4 py-2 text-black border border-black bg-white align-top">
											<textarea
												class="w-full border border-gray-300 rounded px-2 py-1 text-xs min-h-[60px]"
												value={criteres[idx]}
												on:input={(e) => {
													const v = (e.target as HTMLTextAreaElement).value;
													const r = impactRows[i];
													if (!r.criteres || r.criteres.length !== impactDefinitionsRows.length) r.criteres = getImpactRowCriteres(r).slice();
													r.criteres[idx] = v;
													impactRows = impactRows;
													saveCustomMethodState();
												}}
											></textarea>
										</td>
									{/each}
									{#if editModeAideRisque && !readOnlyAideRisque}
										<td class="px-2 py-2 border border-black bg-gray-100">
											<select class="w-full text-xs rounded border border-gray-300 px-1 py-1" bind:value={impactRows[i].bgColor} on:change={() => saveCustomMethodState()}>
												{#each AIDE_RISQUE_COULEURS as c}
													<option value={c}>{c.replace('bg-', '').replace(' text-', ' / ')}</option>
												{/each}
											</select>
										</td>
										<td class="px-4 py-2 border border-black bg-gray-100 text-center">
											<div class="flex gap-1 justify-center flex-wrap">
												<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererImpactAvant(i)} title="Ajouter avant">↑+</button>
												<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererImpactApres(i)} title="Ajouter après">↓+</button>
												<button type="button" class="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerImpact(i)} title="Supprimer" disabled={impactRows.length <= 1}>✕</button>
											</div>
										</td>
									{/if}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				{#if editModeAideRisque && !readOnlyAideRisque}
					<div class="flex gap-2 mt-2">
						<button type="button" class="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700" on:click={ajouterImpact}>+ Ajouter une ligne</button>
						{#if impactRows.length > 1}
							<button type="button" class="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerImpact(impactRows.length - 1)}>- Supprimer la dernière ligne</button>
						{/if}
					</div>
				{/if}
				<p class="text-xs text-gray-600">
					Les libellés des colonnes (Financier, Réputation, Parties prenantes, Réglementaire, etc.) sont des axes d'analyse principaux à adapter dans «&nbsp;Critères d'impact&nbsp;» ci‑dessus.
				</p>
			</section>

			<!-- Tableau 3.1 – Fréquence / probabilité d'occurrence (échelle de risque) -->
			<section class="space-y-3">
				<h3 class="text-lg font-semibold text-gray-900">
					Tableau 3.1&nbsp;: Fréquence / probabilité d'occurrence (échelle de risque)
				</h3>
				<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
					<table class="min-w-full text-sm border-collapse border border-black">
						<thead>
							<tr>
								<th colspan={editModeAideRisque && !readOnlyAideRisque ? 5 : 3} class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">
									Fréquence / Probabilité d'occurrence
								</th>
							</tr>
							<tr>
								<th class="px-4 py-2 text-left font-semibold text-white bg-slate-900 border border-black">Échelle</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-slate-900 border border-black">Définition</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-slate-900 border border-black">Signification</th>
								{#if editModeAideRisque && !readOnlyAideRisque}
									<th class="px-4 py-2 text-left font-semibold text-white bg-slate-900 border border-black">Couleur</th>
									<th class="px-4 py-2 text-left font-semibold text-white bg-slate-900 border border-black">Actions</th>
								{/if}
							</tr>
						</thead>
						<tbody>
							{#each frequenceRisqueRows as row, i}
								<tr class="border border-black">
									<td class="cell-bg-white px-4 py-2 text-black border border-black bg-white">
										<input class="w-full border border-gray-300 rounded px-2 py-1 text-sm" type="text" bind:value={frequenceRisqueRows[i].echelle} />
									</td>
									<td class={`px-4 py-2 cell-colored-definition ${getFrequenceRowBg(row)}`}>
										<input class="w-full border border-transparent bg-transparent font-semibold" type="text" bind:value={frequenceRisqueRows[i].definition} />
									</td>
									<td class="cell-bg-white px-4 py-2 text-black border border-black bg-white">
										<input class="w-full border border-gray-300 rounded px-2 py-1 text-sm" type="text" bind:value={frequenceRisqueRows[i].signification} />
									</td>
									{#if editModeAideRisque && !readOnlyAideRisque}
										<td class="px-2 py-2 border border-black bg-gray-100">
											<select class="w-full text-xs rounded border border-gray-300 px-1 py-1" bind:value={(frequenceRisqueRows[i] as Row & { bgColor?: string }).bgColor} on:change={() => saveCustomMethodState()}>
												{#each AIDE_RISQUE_COULEURS as c}
													<option value={c}>{c.replace('bg-', '').replace(' text-', ' / ')}</option>
												{/each}
											</select>
										</td>
										<td class="px-4 py-2 border border-black bg-gray-100 text-center">
											<div class="flex gap-1 justify-center flex-wrap">
												<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererFrequenceAvant(i)} title="Ajouter avant">↑+</button>
												<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererFrequenceApres(i)} title="Ajouter après">↓+</button>
												<button type="button" class="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerFrequence(i)} title="Supprimer" disabled={frequenceRisqueRows.length <= 1}>✕</button>
											</div>
										</td>
									{/if}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				{#if editModeAideRisque && !readOnlyAideRisque}
					<div class="flex gap-2 mt-2">
						<button type="button" class="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700" on:click={ajouterFrequence}>+ Ajouter une ligne</button>
						{#if frequenceRisqueRows.length > 1}
							<button type="button" class="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerFrequence(frequenceRisqueRows.length - 1)}>- Supprimer la dernière ligne</button>
						{/if}
					</div>
				{/if}
			</section>

			<!-- Tableau 3.2 – Matrice de vraisemblance du risque (couleurs selon intervalles du tableau 3.1) -->
			<section class="space-y-3">
				<h3 class="text-lg font-semibold text-gray-900">
					Tableau 3.2&nbsp;: Matrice de vraisemblance du risque
				</h3>
				<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
					<table class="min-w-full text-sm border-collapse border border-black">
						<thead>
							<tr>
								<th class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">
									Impact du risque × Criticité de l'actif \ Vraisemblance du risque
								</th>
								<!-- Colonnes de données : en-têtes 1, 2, …, n (toujours avant Actions) ; nouvelle colonne = n+1 -->
								{#each Array.from({ length: getMatriceColumnCount() }, (_, i) => i) as colIndex}
									<th class="px-4 py-2 text-sm font-semibold border border-black bg-gray-100 relative">
										{colIndex + 1}
										{#if (editModeAideRisque && !readOnlyAideRisque) && getMatriceColumnCount() > 1}
											<button type="button" class="absolute -top-0.5 -right-0.5 w-5 h-5 text-[10px] bg-red-600 text-white rounded-full hover:bg-red-700 leading-none" title="Supprimer cette colonne" on:click={() => supprimerColonneMatrice(colIndex)}>✕</button>
										{/if}
									</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each matriceRisqueRows as row, i}
								<tr class="border border-black">
									<td class="cell-bg-white px-2 py-2 text-sm border border-black bg-white">
										<input class="w-20 border border-gray-300 rounded px-1 py-0.5 text-sm" type="text" bind:value={matriceRisqueRows[i].libelle} />
									</td>
									{#each row.valeurs as v, j}
										<td class={`px-2 py-2 text-xs text-center border border-black cell-colored-matrice ${getMatriceCellBgFromFrequence(v)}`}>
											{#if readOnlyAideRisque}
												<span class="inline-block w-full text-center font-medium tabular-nums">{matriceRisqueRows[i].valeurs[j]}</span>
											{:else}
												<input class="w-16 text-center border border-gray-300 rounded px-1 py-0.5 text-xs bg-transparent" type="number" bind:value={matriceRisqueRows[i].valeurs[j]} />
											{/if}
										</td>
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				{#if editModeAideRisque && !readOnlyAideRisque}
					<div class="flex gap-2 mt-2 flex-wrap">
						<button type="button" class="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700" on:click={ajouterMatrice}>+ Ajouter une ligne</button>
						{#if matriceRisqueRows.length > 1}
							<button type="button" class="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerMatrice(matriceRisqueRows.length - 1)}>- Supprimer la dernière ligne</button>
						{/if}
						<button type="button" class="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700" on:click={ajouterColonneMatrice} title="Ajoute une colonne avant Actions avec l'en-tête n°{getMatriceColumnCount() + 1}">+ Ajouter une colonne (n°{getMatriceColumnCount() + 1})</button>
						{#if getMatriceColumnCount() > 1}
							<button type="button" class="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerColonneMatrice(getMatriceColumnCount() - 1)}>- Supprimer la dernière colonne</button>
						{/if}
					</div>
				{/if}
				<p class="text-xs text-gray-600">
					Les couleurs des cellules sont déterminées par les intervalles du tableau «&nbsp;Fréquence / probabilité d'occurrence&nbsp;» (Tableau 3.1). Modifiez ces intervalles pour que la matrice reflète vos seuils.
				</p>
			</section>

			<!-- Tableau : Niveaux d'efficacité (échelle 1-5) -->
			<section class="space-y-3">
				<h3 class="text-lg font-semibold text-gray-900">
					Niveaux d'efficacité
				</h3>
				<div class="overflow-x-auto overflow-hidden rounded-lg border border-black bg-white shadow-sm">
					<table class="min-w-full text-sm border-collapse border border-black">
						<colgroup>
							<col style="width: 3rem;" />
							<col style="width: 6rem;" />
							<col style="width: 38px;" />
							<col style="width: 38px;" />
							<col style="width: 38px;" />
							<col style="width: 8rem;" />
							<col style="width: 4rem;" />
							{#if editModeAideRisque && !readOnlyAideRisque}
								<col style="width: 6rem;" />
								<col style="width: 5rem;" />
							{/if}
						</colgroup>
						<thead>
							<tr>
								<th class="px-3 py-2.5 text-center text-[11px] font-bold text-white border border-black whitespace-nowrap" style="background-color: #263c18;">
									Niveau
								</th>
								<th class="px-3 py-2.5 text-center text-[11px] font-bold text-white border border-black whitespace-nowrap" style="background-color: #263c18;">
									Signification
								</th>
								<th colspan="3" class="px-3 py-2.5 text-center text-[11px] font-bold text-white border border-black" style="background-color: #263c18;">
									Descriptif
								</th>
								<th class="px-3 py-2.5 text-center text-[11px] font-bold text-white border border-black whitespace-nowrap" style="background-color: #263c18;">
									Intervalle d'efficacité (%)
								</th>
								<th class="px-3 py-2.5 text-center text-[11px] font-bold text-white border border-black whitespace-nowrap" style="background-color: #263c18;">
									Valeur correspondante
								</th>
								{#if editModeAideRisque && !readOnlyAideRisque}
									<th class="px-3 py-2.5 text-center text-[11px] font-bold text-white border border-black whitespace-nowrap" style="background-color: #263c18;">Couleur</th>
									<th class="px-3 py-2.5 text-center text-[11px] font-bold text-white border border-black whitespace-nowrap" style="background-color: #263c18;">Actions</th>
								{/if}
							</tr>
						</thead>
						<tbody>
							{#each efficaciteRows as row, i}
								<tr class="border border-black">
									<td class="cell-bg-white px-3 py-2 text-center border border-black bg-white">
										<input class="w-full border border-gray-300 rounded px-2 py-1 text-sm font-bold text-center" type="text" bind:value={efficaciteRows[i].niveau} on:input={invalidateEfficaciteRows} on:blur={commitEfficaciteRows} />
									</td>
									<td class={`px-3 py-2 text-center font-bold cell-colored-definition ${getEfficaciteRowBg(row)}`}>
										<input class="w-full border border-transparent bg-transparent font-semibold text-center" type="text" bind:value={efficaciteRows[i].signification} on:input={invalidateEfficaciteRows} on:blur={commitEfficaciteRows} />
									</td>
									<td colspan="3" class="cell-bg-white px-3 py-3 text-left align-middle border border-black bg-white align-top">
										<textarea class="w-full min-h-[120px] min-w-0 border border-gray-300 rounded px-2 py-1.5 text-base whitespace-pre-wrap" bind:value={efficaciteRows[i].descriptif} on:input={invalidateEfficaciteRows} on:blur={commitEfficaciteRows} placeholder="Descriptif du niveau…"></textarea>									</td>
									<td class="cell-bg-white px-3 py-2 text-center border border-black bg-white">
										<input class="w-full border border-gray-300 rounded px-2 py-1 text-sm font-bold text-center" type="text" bind:value={efficaciteRows[i].intervalle} on:input={invalidateEfficaciteRows} on:blur={commitEfficaciteRows} placeholder="0 % – 30 %" />
									</td>
									<td class="cell-bg-white px-3 py-2 text-center border border-black bg-white">
										<input class="w-full border border-gray-300 rounded px-2 py-1 text-sm text-center" type="text" inputmode="decimal" bind:value={efficaciteRows[i].valeur} on:input={invalidateEfficaciteRows} on:blur={commitEfficaciteRows} placeholder="0.15" />
									</td>
									{#if editModeAideRisque && !readOnlyAideRisque}
										<td class="px-2 py-2 border border-black bg-gray-100">
											<select class="w-full text-xs rounded border border-gray-300 px-1 py-1" bind:value={efficaciteRows[i].bgColor} on:change={() => saveCustomMethodState()}>
												{#each AIDE_RISQUE_COULEURS as c}
													<option value={c}>{c.replace('bg-', '').replace(' text-', ' / ')}</option>
												{/each}
											</select>
										</td>
										<td class="px-3 py-2 border border-black bg-gray-100 text-center">
											<div class="flex gap-1 justify-center flex-wrap">
												<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererEfficaciteAvant(i)} title="Ajouter avant">↑+</button>
												<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererEfficaciteApres(i)} title="Ajouter après">↓+</button>
												<button type="button" class="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerEfficacite(i)} title="Supprimer" disabled={efficaciteRows.length <= 1}>✕</button>
											</div>
										</td>
									{/if}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				{#if editModeAideRisque && !readOnlyAideRisque}
					<div class="flex gap-2 mt-2">
						<button type="button" class="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700" on:click={ajouterEfficacite}>+ Ajouter une ligne</button>
						{#if efficaciteRows.length > 1}
							<button type="button" class="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerEfficacite(efficaciteRows.length - 1)}>- Supprimer la dernière ligne</button>
						{/if}
					</div>
				{/if}
				
			</section>
		</section>
	{:else if activeSection === 'synthese'}
		<section class="space-y-8 pb-24">
			<div class="flex items-center justify-between gap-4 flex-wrap">
				<h2 class="text-xl font-semibold text-gray-900">Synthèse</h2>
			</div>
		</section>
	{:else if activeSection === 'ptr'}
		<section class="space-y-4">
			<div class="flex items-center justify-between gap-4 flex-wrap">
				<h2 class="text-xl font-semibold text-gray-900">PTR</h2>
				<button
					type="button"
					class="px-3 py-1.5 text-sm rounded {editModePTR
						? 'bg-gray-600 text-white hover:bg-gray-700'
						: 'bg-sky-600 text-white hover:bg-sky-700'}"
					on:click={() => (editModePTR = !editModePTR)}
				>
					{editModePTR ? 'Terminer la modification' : 'Modifier'}
				</button>
			</div>
			<p class="text-gray-700 mb-4">
				Plan de traitement des risques (PTR)
			</p>

			<!-- Graphique circulaire : répartition des actions par état d'avancement (centré, couleurs fixes par état) -->
			<div class="mb-6 p-4 bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col items-center justify-center">
				<h3 class="text-sm font-semibold text-gray-800 mb-3">Répartition des actions par état d'avancement</h3>
				{#key ptrAvancementStats}
					<div class="w-full max-w-md h-64 mx-auto">
						<DonutChart
							name="ptr-avancement-donut"
							s_label="État d'avancement"
							title=""
							values={ptrAvancementStats}
							showPercentage={true}
							width="w-full"
							height="h-64"
						/>
					</div>
				{/key}
			</div>

			<div class="overflow-x-auto border border-gray-300 rounded-lg">
				<table class="ptr-table min-w-full bg-white">
					<thead>
						<tr class="bg-[#FFC000]">
							<th class="px-4 py-3 text-left text-sm font-bold text-gray-900 border border-gray-300">
								REF Risque
							</th>
							<th class="px-4 py-3 text-left text-sm font-bold text-gray-900 border border-gray-300">
								Corresp. ISO27001, annexe A
							</th>
							<th class="px-4 py-3 text-left text-sm font-bold text-gray-900 border border-gray-300">
								Propriétaire du risque
							</th>
							<th class="px-4 py-3 text-left text-sm font-bold text-gray-900 border border-gray-300">
								Niveau du risque net
							</th>
							<th class="px-4 py-3 text-left text-sm font-bold text-gray-900 border border-gray-300">
								Décision
							</th>
							<th class="px-4 py-3 text-left text-sm font-bold text-gray-900 border border-gray-300">
								ID PTR
							</th>
							<th class="px-4 py-3 text-left text-sm font-bold text-gray-900 border border-gray-300">
								Action à mettre en place
							</th>
							<th class="px-4 py-3 text-left text-sm font-bold text-gray-900 border border-gray-300">
								Type de l'action
							</th>
							<th class="px-4 py-3 text-left text-sm font-bold text-gray-900 border border-gray-300">
								Porteur de l'action
							</th>
							<th class="px-4 py-3 text-left text-sm font-bold text-gray-900 border border-gray-300">
								Priorité
							</th>
							<th class="px-4 py-3 text-left text-sm font-bold text-gray-900 border border-gray-300">
								Durée de mise en oeuvre
							</th>
							<th class="px-4 py-3 text-left text-sm font-bold text-gray-900 border border-gray-300">
								Complexité
							</th>
							<th class="px-4 py-3 text-left text-sm font-bold text-gray-900 border border-gray-300">
								Echéance
							</th>
							<th class="px-4 py-3 text-left text-sm font-bold text-gray-900 border border-gray-300">
								Etat d'avancement
							</th>
							{#if editModePTR}
							<th class="px-4 py-3 text-center text-sm font-bold text-gray-900 border border-gray-300">
								Actions
							</th>
							{/if}
						</tr>
					</thead>
					<tbody>
						{#each ptrData as row, index}
							<tr class="hover:bg-gray-50">
								<td class="px-2 py-1 border border-gray-300 min-h-[80px]">
									<textarea
										value={row.refRisque}
										on:input={(e) => updateCell(index, 'refRisque', e)}
										on:blur={() => { fillPtrFromCartographie(index); saveCustomMethodState(); }}
										class="w-full px-2 py-1 text-sm border-0 focus:ring-2 focus:ring-blue-500 rounded min-h-[80px] resize-y"
										placeholder="Code risque (ex. DSI-R-SP-001)"
										title="Saisir le code risque puis quitter le champ pour importer les données de la cartographie"
									></textarea>
								</td>
								<td class="px-2 py-1 border border-gray-300 min-h-[80px]" title={getIso27001ControlTooltip(row.correspISO)}>
									<textarea
										value={row.correspISO}
										on:input={(e) => updateCell(index, 'correspISO', e)}
										on:blur={() => saveCustomMethodState()}
										class="w-full px-2 py-1 text-sm border-0 focus:ring-2 focus:ring-blue-500 rounded min-h-[80px] resize-y"
										placeholder=""
										title={getIso27001ControlTooltip(row.correspISO)}
									></textarea>
								</td>
								<td class="px-2 py-1 border border-gray-300 min-h-[80px]">
									<textarea
										value={row.proprietaire}
										on:input={(e) => updateCell(index, 'proprietaire', e)}
										on:blur={() => saveCustomMethodState()}
										class="w-full px-2 py-1 text-sm border-0 focus:ring-2 focus:ring-blue-500 rounded min-h-[80px] resize-y"
										placeholder=""
									></textarea>
								</td>
								<td class="px-2 py-2 border border-gray-300 {getNiveauRisqueBg(row.niveauRisque)}">
									<select
										value={row.niveauRisque}
										on:change={(e) => updateCell(index, 'niveauRisque', e)}
										class="w-full px-2 py-1 text-sm border-0 focus:ring-2 focus:ring-blue-500 rounded bg-transparent"
									>
										<option value="">-</option>
										{#each frequenceRisqueRows as fr}
											<option value={fr.definition}>{fr.definition || '(vide)'}</option>
										{/each}
									</select>
								</td>
								<td class="px-2 py-2 border border-gray-300">
									<select
										value={row.decision}
										on:change={(e) => updateCell(index, 'decision', e)}
										class="w-full px-2 py-1 text-sm border-0 focus:ring-2 focus:ring-blue-500 rounded"
									>
										<option value="">-</option>
										<option value="Accepter">Accepter</option>
										<option value="Réduire">Réduire</option>
										<option value="Transférer">Transférer</option>
										<option value="Éviter">Éviter</option>
									</select>
								</td>
								<td class="px-2 py-1 border border-gray-300 min-h-[80px]">
									<div class="w-full px-2 py-1 text-sm font-medium text-gray-700" title="ID PTR (automatique selon la position de la ligne)">
										PTR-{String(index + 1).padStart(3, '0')}
									</div>
								</td>
								<td class="px-2 py-1 border border-gray-300 min-h-[80px]">
									<textarea
										value={row.action}
										on:input={(e) => updateCell(index, 'action', e)}
										on:blur={() => saveCustomMethodState()}
										class="w-full px-2 py-1 text-sm border-0 focus:ring-2 focus:ring-blue-500 rounded min-h-[80px] resize-y"
										placeholder=""
									></textarea>
								</td>
								<td class="px-2 py-2 border border-gray-300 {getTypeActionBg(row.typeAction)}">
									<select
										value={row.typeAction}
										on:change={(e) => updateCell(index, 'typeAction', e)}
										class="w-full px-2 py-1 text-sm border-0 bg-transparent focus:ring-2 focus:ring-blue-500 rounded"
									>
										<option value="">-</option>
										{#each typeActionRows as tr}
											<option value={tr.type_action}>{tr.type_action || '(vide)'}</option>
										{/each}
									</select>
								</td>
								<td class="px-2 py-1 border border-gray-300 min-h-[80px]">
									<textarea
										value={row.porteur}
										on:input={(e) => updateCell(index, 'porteur', e)}
										on:blur={() => saveCustomMethodState()}
										class="w-full px-2 py-1 text-sm border-0 focus:ring-2 focus:ring-blue-500 rounded min-h-[80px] resize-y"
										placeholder=""
									></textarea>
								</td>
								<td class="px-2 py-2 border border-gray-300 {getPrioriteDefinitionBg(row.priorite)}">
									<select
										value={row.priorite}
										on:change={(e) => updateCell(index, 'priorite', e)}
										class="w-full px-2 py-1 text-sm border-0 bg-transparent focus:ring-2 focus:ring-blue-500 rounded"
									>
										<option value="">-</option>
										{#each prioriteRows as pr}
											<option value={pr.echelle}>{pr.echelle || '(vide)'}</option>
										{/each}
									</select>
								</td>
								<td class="px-2 py-2 border border-gray-300 {getPeriodiciteBg(row.periodicite)}">
									<select
										value={row.periodicite}
										on:change={(e) => updateCell(index, 'periodicite', e)}
										class="w-full px-2 py-1 text-sm border-0 bg-transparent focus:ring-2 focus:ring-blue-500 rounded"
									>
										<option value="">-</option>
										{#each periodiciteRows as per}
											<option value={per.periodicite}>{per.periodicite || '(vide)'}</option>
										{/each}
									</select>
								</td>
								<td class="px-2 py-2 border border-gray-300 {getComplexiteBg(row.complexite)}">
									<select
										value={row.complexite}
										on:change={(e) => updateCell(index, 'complexite', e)}
										class="w-full px-2 py-1 text-sm border-0 bg-transparent focus:ring-2 focus:ring-blue-500 rounded"
									>
										<option value="">-</option>
										{#each complexiteRows as cr}
											<option value={cr.complexite}>{cr.complexite || '(vide)'}</option>
										{/each}
									</select>
								</td>
								<td class="px-2 py-2 border border-gray-300">
									<input
										type="date"
										value={row.echeance}
										on:input={(e) => updateCell(index, 'echeance', e)}
										class="w-full px-2 py-1 text-sm border-0 focus:ring-2 focus:ring-blue-500 rounded"
									/>
								</td>
								<td class="px-2 py-2 border border-gray-300 {getPtrEtatAvancementBg(row.etatAvancement)}">
									<select
										value={row.etatAvancement}
										on:change={(e) => updateCell(index, 'etatAvancement', e)}
										class="w-full px-2 py-1 text-sm border-0 bg-transparent focus:ring-2 focus:ring-blue-500 rounded [color:inherit]"
									>
										<option value="">-</option>
										<option value="Non démarrée">Non démarrée</option>
										<option value="En cours">En cours</option>
										<option value="Terminée">Terminée</option>
										<option value="En retard">En retard</option>
									</select>
								</td>
								{#if editModePTR}
								<td class="px-2 py-2 border border-gray-300 text-center">
									<div class="flex gap-1 justify-center flex-wrap">
										<button
											on:click={() => monterLignePTR(index)}
											class="px-2 py-1 bg-amber-500 text-white text-xs rounded hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
											title="Monter la ligne"
											disabled={index === 0}
										>
											↑
										</button>
										<button
											on:click={() => descendreLignePTR(index)}
											class="px-2 py-1 bg-amber-500 text-white text-xs rounded hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
											title="Descendre la ligne"
											disabled={index === ptrData.length - 1}
										>
											↓
										</button>
										<button
											on:click={() => insererPtrAvant(index)}
											class="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
											title="Ajouter avant"
										>
											↑+
										</button>
										<button
											on:click={() => insererPtrApres(index)}
											class="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
											title="Ajouter après"
										>
											↓+
										</button>
										<button
											on:click={() => deleteRow(index)}
											class="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
											title="Supprimer cette ligne"
										>
											✕
										</button>
									</div>
								</td>
								{/if}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			{#if editModePTR}
			<div class="flex gap-2 justify-start mt-4">
				<button
					on:click={addRow}
					class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fill-rule="evenodd"
							d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
							clip-rule="evenodd"
						/>
					</svg>
					Ajouter une ligne
				</button>
				{#if ptrData.length > 1}
					<button
						type="button"
						class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
						on:click={() => deleteRow(ptrData.length - 1)}
					>
						Supprimer la dernière ligne
					</button>
				{/if}
			</div>
			{/if}
		</section>
	{:else if activeSection === 'echelle-ptr'}
		<!-- Échelle PTR : affichage seul sauf si ouverture depuis Paramétrage -->
		<section class="space-y-6 {readOnlyEchellePtr ? 'readonly-scales-section' : ''}">
			<div class="flex items-center justify-between gap-4 flex-wrap">
				<h2 class="text-xl font-semibold text-gray-900">Échelle-PTR</h2>
				{#if readOnlyEchellePtr}
					<p class="text-sm text-gray-500">Affichage des échelles. Pour modifier, utilisez l'onglet <strong>Paramétrage</strong>.</p>
				{:else}
					<button
						type="button"
						class="px-3 py-1.5 text-sm rounded {editModeEchellePtr
							? 'bg-gray-600 text-white hover:bg-gray-700'
							: 'bg-sky-600 text-white hover:bg-sky-700'}"
						on:click={() => (editModeEchellePtr = !editModeEchellePtr)}
					>
						{editModeEchellePtr ? 'Terminer la modification' : 'Modifier'}
					</button>
				{/if}
			</div>

			<section class="space-y-4">
				<h3 class="text-lg font-semibold text-gray-900">Table 1&nbsp;: Durée de mise en oeuvre </h3>
				<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
					<table class="min-w-full text-sm border-collapse border border-black">
						<thead>
							<tr>
								<th class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">Durée de mise en oeuvre</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">Description</th>
								{#if (editModeEchellePtr && !readOnlyEchellePtr) || parametrageEditPtr}
									<th class="px-2 py-2 text-center font-semibold text-white bg-yellow-500 border border-black min-w-[120px]">Couleur</th>
									<th class="px-2 py-2 text-center font-semibold text-white bg-yellow-500 border border-black">Actions</th>
								{/if}
							</tr>
						</thead>
						<tbody>
							{#each periodiciteRows as row, i}
								<tr class="border border-black">
									<td class={`px-4 py-2 text-black cell-colored-definition ${getPeriodiciteBg(row.periodicite)}`}>
										<input class="w-full border border-transparent bg-transparent" type="text" bind:value={periodiciteRows[i].periodicite} />
									</td>
									<td class="cell-bg-white px-4 py-2 text-black border border-black bg-white">
										<input class="w-full border border-gray-300 rounded px-2 py-1 text-sm" type="text" bind:value={periodiciteRows[i].duree} />
									</td>
									{#if (editModeEchellePtr && !readOnlyEchellePtr) || parametrageEditPtr}
										<td class="px-2 py-2 border border-black bg-gray-50 align-middle">
											<select class="w-full border border-gray-300 rounded px-1 py-0.5 text-xs" bind:value={periodiciteRows[i].bgColor} on:change={() => saveCustomMethodState()}>
												{#each ECHELLE_PTR_COULEURS as c}
													<option value={c}>{c}</option>
												{/each}
											</select>
										</td>
										<td class="px-2 py-2 border border-black bg-gray-100 text-center">
											<div class="flex gap-1 justify-center">
												<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererPeriodiciteAvant(i)} title="Ajouter avant">↑+</button>
												<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererPeriodiciteApres(i)} title="Ajouter après">↓+</button>
												<button type="button" class="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerPeriodicite(i)} title="Supprimer">✕</button>
											</div>
										</td>
									{/if}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				{#if (editModeEchellePtr && !readOnlyEchellePtr) || parametrageEditPtr}
					<div class="flex gap-2 mt-2">
						<button type="button" class="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700" on:click={ajouterPeriodicite}>+ Ajouter une ligne</button>
						{#if periodiciteRows.length > 1}
							<button type="button" class="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerPeriodicite(periodiciteRows.length - 1)}>- Supprimer la dernière ligne</button>
						{/if}
					</div>
				{/if}
			</section>

			<section class="space-y-4">
				<h3 class="text-lg font-semibold text-gray-900">Table 2&nbsp;: Niveau de complexité</h3>
				<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
					<table class="min-w-full text-sm align-top border-collapse border border-black">
						<thead>
							<tr>
								<th class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">Complexité</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">Définition du niveau de complexité supposé</th>
								{#if (editModeEchellePtr && !readOnlyEchellePtr) || parametrageEditPtr}
									<th class="px-2 py-2 text-center font-semibold text-white bg-yellow-500 border border-black min-w-[120px]">Couleur</th>
									<th class="px-2 py-2 text-center font-semibold text-white bg-yellow-500 border border-black">Actions</th>
								{/if}
							</tr>
						</thead>
						<tbody>
							{#each complexiteRows as row, i}
								<tr class="border border-black">
									<td class={`px-4 py-2 font-medium cell-colored-definition ${getComplexiteBg(row.complexite)}`}>
										<input class="w-full border border-transparent bg-transparent font-medium" type="text" bind:value={complexiteRows[i].complexite} />
									</td>
									<td class="cell-bg-white px-4 py-2 text-black border border-black bg-white">
										<textarea class="w-full border border-gray-300 rounded px-2 py-1 text-sm min-h-[80px]" bind:value={complexiteRows[i].definition}></textarea>
									</td>
									{#if (editModeEchellePtr && !readOnlyEchellePtr) || parametrageEditPtr}
										<td class="px-2 py-2 border border-black bg-gray-50 align-middle">
											<select class="w-full border border-gray-300 rounded px-1 py-0.5 text-xs" bind:value={complexiteRows[i].bgColor} on:change={() => saveCustomMethodState()}>
												{#each ECHELLE_PTR_COULEURS as c}
													<option value={c}>{c}</option>
												{/each}
											</select>
										</td>
										<td class="px-2 py-2 border border-black bg-gray-100 text-center">
											<div class="flex gap-1 justify-center">
												<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererComplexiteAvant(i)} title="Ajouter avant">↑+</button>
												<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererComplexiteApres(i)} title="Ajouter après">↓+</button>
												<button type="button" class="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerComplexite(i)} title="Supprimer">✕</button>
											</div>
										</td>
									{/if}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				{#if (editModeEchellePtr && !readOnlyEchellePtr) || parametrageEditPtr}
					<div class="flex gap-2 mt-2">
						<button type="button" class="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700" on:click={ajouterComplexite}>+ Ajouter une ligne</button>
						{#if complexiteRows.length > 1}
							<button type="button" class="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerComplexite(complexiteRows.length - 1)}>- Supprimer la dernière ligne</button>
						{/if}
					</div>
				{/if}
			</section>

			<section class="space-y-4">
				<h3 class="text-lg font-semibold text-gray-900">Table 3&nbsp;: Type de l'action</h3>
				<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
					<table class="min-w-full text-sm align-top border-collapse border border-black">
						<thead>
							<tr>
								<th class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">Type de l'action</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">Description</th>
								{#if (editModeEchellePtr && !readOnlyEchellePtr) || parametrageEditPtr}
									<th class="px-2 py-2 text-center font-semibold text-white bg-yellow-500 border border-black min-w-[120px]">Couleur</th>
									<th class="px-2 py-2 text-center font-semibold text-white bg-yellow-500 border border-black">Actions</th>
								{/if}
							</tr>
						</thead>
						<tbody>
							{#each typeActionRows as row, i}
								<tr class="border border-black">
									<td class={`px-4 py-2 font-medium cell-colored-definition ${getTypeActionBg(row.type_action)}`}>
										<input class="w-full border border-transparent bg-transparent font-medium" type="text" bind:value={typeActionRows[i].type_action} />
									</td>
									<td class="cell-bg-white px-4 py-2 text-black border border-black bg-white">
										<textarea class="w-full border border-gray-300 rounded px-2 py-1 text-sm min-h-[60px]" bind:value={typeActionRows[i].description}></textarea>
									</td>
									{#if (editModeEchellePtr && !readOnlyEchellePtr) || parametrageEditPtr}
										<td class="px-2 py-2 border border-black bg-gray-50 align-middle">
											<select class="w-full border border-gray-300 rounded px-1 py-0.5 text-xs" bind:value={typeActionRows[i].bgColor} on:change={() => saveCustomMethodState()}>
												{#each ECHELLE_PTR_COULEURS as c}
													<option value={c}>{c}</option>
												{/each}
											</select>
										</td>
										<td class="px-2 py-2 border border-black bg-gray-100 text-center">
											<div class="flex gap-1 justify-center">
												<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererTypeActionAvant(i)} title="Ajouter avant">↑+</button>
												<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererTypeActionApres(i)} title="Ajouter après">↓+</button>
												<button type="button" class="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerTypeAction(i)} title="Supprimer">✕</button>
											</div>
										</td>
									{/if}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				{#if (editModeEchellePtr && !readOnlyEchellePtr) || parametrageEditPtr}
					<div class="flex gap-2 mt-2">
						<button type="button" class="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700" on:click={ajouterTypeAction}>+ Ajouter une ligne</button>
						{#if typeActionRows.length > 1}
							<button type="button" class="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerTypeAction(typeActionRows.length - 1)}>- Supprimer la dernière ligne</button>
						{/if}
					</div>
				{/if}
			</section>

			<section class="space-y-4">
				<h3 class="text-lg font-semibold text-gray-900">Table 4&nbsp;: Priorité de l'action</h3>
				<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
					<table class="min-w-full text-sm border-collapse border border-black">
						<thead>
							<tr>
								<th colspan={(editModeEchellePtr && !readOnlyEchellePtr) ? 5 : 3} class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">Priorité de l'action</th>
							</tr>
							<tr>
								<th class="px-4 py-2 text-left font-semibold text-white bg-slate-900 border border-black">Échelle</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-slate-900 border border-black">Définition</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-slate-900 border border-black">Signification (score)</th>
								{#if (editModeEchellePtr && !readOnlyEchellePtr) || parametrageEditPtr}
									<th class="px-2 py-2 text-center font-semibold text-white bg-slate-900 border border-black min-w-[120px]">Couleur</th>
									<th class="px-2 py-2 text-center font-semibold text-white bg-slate-900 border border-black">Actions</th>
								{/if}
							</tr>
						</thead>
						<tbody>
							{#each prioriteRows as row, i}
								<tr class="border border-black">
									<td class="cell-bg-white px-4 py-2 font-medium text-black border border-black bg-white">
										<input class="w-full border border-gray-300 rounded px-2 py-1 text-sm" type="text" bind:value={prioriteRows[i].echelle} />
									</td>
									<td class={`px-4 py-2 cell-colored-definition ${getPrioriteDefinitionBg(row.echelle)}`}>
										<input class="w-full border border-transparent bg-transparent" type="text" bind:value={prioriteRows[i].definition} />
									</td>
									<td class="cell-bg-white px-4 py-2 text-black border border-black bg-white">
										<input class="w-full border border-gray-300 rounded px-2 py-1 text-sm" type="text" bind:value={prioriteRows[i].signification} />
									</td>
									{#if (editModeEchellePtr && !readOnlyEchellePtr) || parametrageEditPtr}
										<td class="px-2 py-2 border border-black bg-gray-50 align-middle">
											<select class="w-full border border-gray-300 rounded px-1 py-0.5 text-xs" bind:value={prioriteRows[i].bgColor} on:change={() => saveCustomMethodState()}>
												{#each ECHELLE_PTR_COULEURS as c}
													<option value={c}>{c}</option>
												{/each}
											</select>
										</td>
										<td class="px-2 py-2 border border-black bg-gray-100 text-center">
											<div class="flex gap-1 justify-center">
												<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererPrioriteAvant(i)} title="Ajouter avant">↑+</button>
												<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => insererPrioriteApres(i)} title="Ajouter après">↓+</button>
												<button type="button" class="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerPriorite(i)} title="Supprimer">✕</button>
											</div>
										</td>
									{/if}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				{#if (editModeEchellePtr && !readOnlyEchellePtr) || parametrageEditPtr}
					<div class="flex gap-2 mt-2">
						<button type="button" class="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700" on:click={ajouterPriorite}>+ Ajouter une ligne</button>
						{#if prioriteRows.length > 1}
							<button type="button" class="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerPriorite(prioriteRows.length - 1)}>- Supprimer la dernière ligne</button>
						{/if}
					</div>
				{/if}
			</section>
		</section>
	{/if}
</main>