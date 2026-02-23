<script lang="ts">
	// Page simple pour afficher une "méthode personnalisée"
	// avec des tableaux statiques basés sur tes définitions en français.

	import { onMount } from 'svelte';
	import { beforeNavigate } from '$app/navigation';

	const CUSTOM_METHOD_STORAGE_KEY = 'ciso-assistant-custom-method';

	type Row = Record<string, string>;

	// Gestion des 7 sous-parties de la méthode personnalisée (ajout de controle-document)
	type SectionId =
		| 'controle-document'
		| 'registre-classification'
		| 'aide-classification'
		| 'cartographie-risques'
		| 'aide-risque'
		| 'ptr'
		| 'echelle-ptr';

	let activeSection: SectionId = 'controle-document';

	// Vue pour la cartographie: identification / risque brut / risque net / PTR+résiduel
	let cartoView: 'all' | 'identification' | 'brut' | 'net' | 'ptr' = 'identification';
	// Version du tableau cartographie : A (criticité/gravité/proba/IPC) ou B (efficacité DMR/PTR)
	let cartoVersion: 'A' | 'B' = 'A';

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

	/** Criticité = MAX(D, I, C) */
	function getCriticite(row: CartoRow): number | null {
		const d = parseNum(row.impactD);
		const i = parseNum(row.impactI);
		const c = parseNum(row.impactC);
		if (d === null && i === null && c === null) return null;
		return Math.max(d ?? 0, i ?? 0, c ?? 0);
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

	/** Niveau: Faible (≤20), Modéré ]20-36], Élevé ]36-60], Extrême >60 — aligné carto_efficacite.xlsx */
	function getNiveauFromIpc(ipc: number | null): string {
		if (ipc === null) return '-';
		if (ipc <= 20) return 'Faible';
		if (ipc <= 36) return 'Modéré';
		if (ipc <= 60) return 'Élevé';
		return 'Extrême';
	}

	/** Couleurs des niveaux de risque (alignées sur les échelles PTR / Fréquence risque) */
	function getNiveauRisqueBg(niveau: string): string {
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

	/** Taux de réduction DMR/PTR (0-1) pour score 1-5 — barème carto_efficacite.xlsx : 1→15%, 2→45%, 3→70%, 4→90%, 5→98% */
	function getTauxReductionEfficacite(score: string | number | null | undefined): number | null {
		const n = typeof score === 'number' ? (Number.isFinite(score) ? score : null) : parseNum(score as string);
		if (n === null || n < 1 || n > 5) return null;
		const taux: Record<number, number> = { 1: 0.15, 2: 0.45, 3: 0.7, 4: 0.9, 5: 0.98 };
		return taux[Math.round(n)] ?? null;
	}

	/** Niveau d'efficacité (AK/AQ) : 1→Insuffisant, 2→Faible, 3→Acceptable, 4→Efficace, 5→Exemplaire */
	function getNiveauEfficaciteLabel(score: string | number | null | undefined): string {
		const n = typeof score === 'number' ? (Number.isFinite(score) ? score : null) : parseNum(score as string);
		if (n === null || n < 1 || n > 5) return '';
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

	// --- Persistence: localStorage + server (shared for all users in the same folder) ---
	function saveCustomMethodState() {
		try {
			// Always read current state at save time (cartoRows is mutated in place by bind:value)
			const state = getFullState();
			localStorage.setItem(CUSTOM_METHOD_STORAGE_KEY, JSON.stringify(state));
			// Save to server so others can view/edit
			fetch('/fe-api/custom-method-state', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(state)
			}).catch((e) => console.warn('Could not save custom method state to server:', e));
		} catch (e) {
			console.warn('Could not save custom method state:', e);
		}
	}

	function loadCustomMethodStateFromStorage() {
		try {
			const raw = localStorage.getItem(CUSTOM_METHOD_STORAGE_KEY);
			if (!raw) return;
			const state = JSON.parse(raw) as Record<string, unknown>;
			applyFullState(state);
		} catch (e) {
			console.warn('Could not load custom method state from localStorage:', e);
		}
	}

	async function loadCustomMethodState() {
		try {
			const res = await fetch('/fe-api/custom-method-state');
			const data = await res.json();
			if (res.ok && data && typeof data === 'object' && Object.keys(data).length > 0) {
				applyFullState(data);
				return;
			}
		} catch (e) {
			console.warn('Could not load custom method state from server:', e);
		}
		loadCustomMethodStateFromStorage();
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

	// When leaving cartographie section, save immediately so bind:value mutations are persisted
	let _prevSection: SectionId = activeSection;
	$: {
		if (typeof window !== 'undefined' && _prevSection === 'cartographie-risques' && activeSection !== 'cartographie-risques') {
			saveCustomMethodState();
		}
		_prevSection = activeSection;
	}

	onMount(() => {
		loadCustomMethodState();
		const saveOnUnload = () => saveCustomMethodState();
		window.addEventListener('beforeunload', saveOnUnload);
		// Cartographie: bind:value mutates in place so reactivity never fires. Save directly every 2s when on that section.
		const cartoPersistInterval = setInterval(() => {
			if (activeSection === 'cartographie-risques') saveCustomMethodState();
		}, 2000);
		return () => {
			window.removeEventListener('beforeunload', saveOnUnload);
			clearInterval(cartoPersistInterval);
		};
	});

	beforeNavigate(({ from }) => {
		if (from?.url?.pathname?.includes('custom-method')) {
			saveCustomMethodState();
		}
	});

	/** Édition au clic : quelle cellule est en cours d'édition (tous tableaux) */
	let editingCell: { table: string; row: number; field: string } | null = null;
	function focusTextareaOnMount(node: HTMLTextAreaElement) {
		node.focus();
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

	let categoriesActifsRows: string[] = [
		'Matériel informatique',
		'Application',
		'Equipements sécurité',
		'Equipements réseaux',
		'Ressources humaines',
		'Document',
		'Données',
		'Site'
	];

	function getPeriodiciteBgDefault(periodicite: string): string {
		switch (periodicite) {
			case 'QuickWin': return 'bg-orange-100';
			case 'Court terme': return 'bg-green-100';
			case 'Moyen terme': return 'bg-yellow-100';
			case 'Long terme': return 'bg-gray-100';
			case 'Périodique': return 'bg-sky-100';
			default: return 'bg-white';
		}
	}
	function getPeriodiciteBg(periodicite: string): string {
		const row = periodiciteRows.find((r) => r.periodicite === periodicite);
		return (row && row.bgColor) ? row.bgColor : getPeriodiciteBgDefault(periodicite);
	}

	function getComplexiteBgDefault(complexite: string): string {
		switch (complexite) {
			case 'Important': return 'bg-red-500 text-black';
			case 'Moyen': return 'bg-yellow-400 text-black';
			case 'Faible': return 'bg-green-400 text-black';
			default: return 'bg-white text-black';
		}
	}
	function getComplexiteBg(complexite: string): string {
		const row = complexiteRows.find((r) => r.complexite === complexite);
		return (row && row.bgColor) ? row.bgColor : getComplexiteBgDefault(complexite);
	}

	function getTypeActionBgDefault(typeAction: string): string {
		switch (typeAction) {
			case 'Action Organisationnelle': return 'bg-sky-100';
			case 'Action Technique': return 'bg-green-100';
			case 'Action Organisationnelle et Technique': return 'bg-amber-100';
			default: return 'bg-white';
		}
	}
	function getTypeActionBg(typeAction: string): string {
		const row = typeActionRows.find((r) => r.type_action === typeAction);
		return (row && row.bgColor) ? row.bgColor : getTypeActionBgDefault(typeAction);
	}

	function getPrioriteDefinitionBgDefault(echelle: string): string {
		switch (echelle) {
			case 'Priorité 4': return 'bg-green-400 text-black';
			case 'Priorité 3': return 'bg-yellow-300 text-black';
			case 'Priorité 2': return 'bg-orange-400 text-black';
			case 'Priorité 1': return 'bg-red-500 text-black';
			default: return 'bg-white text-black';
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

	/** Full state for server/localStorage: all table rows + UI state */
	function getFullState() {
		return {
			cartoRows,
			redactionRows,
			diffusionRows,
			versionRows,
			registreRows,
			showRegistreLoi0520,
			activeSection,
			cartoView,
			cartoVersion,
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
		};
	}

	function applyFullState(state: Record<string, unknown>) {
		if (!state || typeof state !== 'object') return;
		const sectionIds: SectionId[] = ['controle-document', 'registre-classification', 'aide-classification', 'cartographie-risques', 'aide-risque', 'ptr', 'echelle-ptr'];
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
			categoriesActifsRows = state.categoriesActifsRows as string[];
		}
		if (state.probaRows && Array.isArray(state.probaRows) && state.probaRows.length > 0) {
			const rows = state.probaRows as ProbaRow[];
			probaRows = rows.map((r) => ({ ...r, bgColor: r.bgColor ?? getProbaDefBg(r.definition) }));
		}
		if (state.impactRows && Array.isArray(state.impactRows) && state.impactRows.length > 0) {
			const rows = state.impactRows as ImpactRow[];
			impactRows = rows.map((r) => ({ ...r, bgColor: r.bgColor ?? getImpactDefBg(r.definition) }));
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
		}
		// Reconstruire le PTR à partir de la cartographie (une ligne PTR par ligne dans "Action à mettre en place")
		syncPtrFromCartographie();
	}

	function getProbaDefBg(definition: string): string {
		switch (definition) {
			case 'Très faible':
				return 'bg-green-400 text-black';
			case 'Faible':
				return 'bg-yellow-300 text-black';
			case 'Moyen':
				return 'bg-orange-400 text-black';
			case 'Forte':
				return 'bg-red-500 text-black';
			case 'Très forte':
				return 'bg-red-700 text-black';
			default:
				return 'bg-white text-black';
		}
	}
	function getProbaRowBg(row: ProbaRow): string {
		return row.bgColor ?? getProbaDefBg(row.definition);
	}

	function getImpactDefBg(definition: string): string {
		switch (definition) {
			case 'Très faible':
				return 'bg-green-400 text-black';
			case 'Faible':
				return 'bg-yellow-300 text-black';
			case 'Moyen':
				return 'bg-orange-400 text-black';
			case 'Fort':
				return 'bg-red-500 text-black';
			case 'Très fort':
				return 'bg-red-700 text-black';
			case 'Critique':
				return 'bg-red-900 text-white';
			default:
				return 'bg-white text-black';
		}
	}
	function getImpactRowBg(row: ImpactRow): string {
		return row.bgColor ?? getImpactDefBg(row.definition);
	}

	function getFrequenceDefBg(definition: string): string {
		switch (definition) {
			case 'Risque Faible':
				return 'bg-green-400 text-black';
			case 'Risque Modéré':
				return 'bg-yellow-300 text-black';
			case 'Risque Elevé':
				return 'bg-orange-400 text-black';
			case 'Risque Extrême':
				return 'bg-red-500 text-black';
			default:
				return 'bg-white text-black';
		}
	}
	function getFrequenceRowBg(row: Row): string {
		return (row as Row & { bgColor?: string }).bgColor ?? getFrequenceDefBg(row.definition ?? '');
	}

	function getEfficaciteDefBg(signification: string): string {
		switch (signification) {
			case 'Insuffisant':
				return 'bg-[#ff0000] text-black';
			case 'Faible':
				return 'bg-[#ffc000] text-black';
			case 'Acceptable':
				return 'bg-[#ffff00] text-black';
			case 'Efficace':
				return 'bg-[#92d050] text-black';
			case 'Exemplaire':
				return 'bg-[#00b050] text-white';
			default:
				return 'bg-white text-black';
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
	}

	function supprimerLigneDiffusion(index: number) {
		diffusionRows = diffusionRows.filter((_, i) => i !== index);
	}

	function insererLigneDiffusionAvant(index: number) {
		diffusionRows = insererLigneAvant(diffusionRows, index, { nom: '', entite_fonction: '', date: '' });
	}

	function insererLigneDiffusionApres(index: number) {
		diffusionRows = insererLigneApres(diffusionRows, index, { nom: '', entite_fonction: '', date: '' });
	}

	function ajouterLigneVersion() {
		versionRows = [...versionRows, { version: '', date: '', modification: '' }];
	}

	function supprimerLigneVersion(index: number) {
		versionRows = versionRows.filter((_, i) => i !== index);
	}

	function insererLigneVersionAvant(index: number) {
		versionRows = insererLigneAvant(versionRows, index, { version: '', date: '', modification: '' });
	}

	function insererLigneVersionApres(index: number) {
		versionRows = insererLigneApres(versionRows, index, { version: '', date: '', modification: '' });
	}

	// Fonctions pour tableau Rédaction (Contrôle du document)
	function ajouterLigneRedaction() {
		redactionRows = [...redactionRows, { role: '', nom: '', fonction: '', date: '' }];
	}

	function supprimerLigneRedaction(index: number) {
		redactionRows = redactionRows.filter((_, i) => i !== index);
	}

	function insererLigneRedactionAvant(index: number) {
		redactionRows = insererLigneAvant(redactionRows, index, { role: '', nom: '', fonction: '', date: '' });
	}

	function insererLigneRedactionApres(index: number) {
		redactionRows = insererLigneApres(redactionRows, index, { role: '', nom: '', fonction: '', date: '' });
	}

	function ajouterCategorieActif() {
		categoriesActifsRows = [...categoriesActifsRows, ''];
	}

	function supprimerCategorieActif(index: number) {
		categoriesActifsRows = categoriesActifsRows.filter((_, i) => i !== index);
	}

	function insererCategorieActifAvant(index: number) {
		categoriesActifsRows = insererLigneAvant(categoriesActifsRows, index, '');
	}

	function insererCategorieActifApres(index: number) {
		categoriesActifsRows = insererLigneApres(categoriesActifsRows, index, '');
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
		return { echelle: '', definition: '', financier: '', reputation: '', parties_prenantes: '', reglementaire: '', bgColor: 'bg-white text-black' };
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
		if (impactDefinitionsRows.length >= 8) return; /* max 8 pour la cartographie (colonnes fixes) */
		impactDefinitionsRows = [...impactDefinitionsRows, { libelle: 'Nouvel impact', definition: '' }];
		syncCartoRowsImpacts();
		saveCustomMethodState();
	}

	function supprimerDefinitionImpact(index: number) {
		if (impactDefinitionsRows.length <= 1) return;
		impactDefinitionsRows = impactDefinitionsRows.filter((_, i) => i !== index);
		syncCartoRowsImpacts();
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
	}
	function insererEfficaciteApres(index: number) {
		efficaciteRows = insererLigneApres(efficaciteRows, index, defaultEfficaciteRow());
	}
	function ajouterEfficacite() {
		efficaciteRows = [...efficaciteRows, defaultEfficaciteRow()];
	}
	function supprimerEfficacite(index: number) {
		efficaciteRows = supprimerLigneAt(efficaciteRows, index);
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
		if (c.includes('DSI-R-PSE')) return 2;
		if (c.includes('DSI-R-SP')) return 1;
		if (c.includes('DSI-R-CI')) return 3;
		if (c.includes('DSI-R-CF')) return 4;
		if (c.includes('DSI-R-AI')) return 5;
		if (c.includes('DSI-R-MP')) return 6;
		if (c.includes('DSI-R-CL')) return 7;
		if (c.includes('DSI-R-TIER')) return 8;
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

	/** Couleur de fond de l'échelle loi 05.20 : TG → rouge pâle, G → orange saumon, M → jaune, L → vert clair */
	function getLoi0520ImpactBg(val: string | undefined): string {
		const letter = firstLetter0520(val);
		if (letter === 'T') return '#f87171';
		if (letter === 'G') return '#fb923c';
		if (letter === 'M') return '#FFFF00';
		if (letter === 'L') return '#A1FB7D';
		return '';
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

	/** Quand la catégorie de l'actif est Document ou Données => Type = Primaire, sinon Secondaire */
	function mettreAJourTypeActif(index: number) {
		const cat = (registreRows[index].categorie_actif || '').trim().toLowerCase();
		registreRows[index].type_actif = cat === 'document' || cat === 'données' ? 'Primaire' : 'Secondaire';
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
						niveauRisque: getNiveauNet(carto) || r.niveauRisque,
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
						niveauRisque: getNiveauNet(carto) || existing.niveauRisque || '',
						decision: (carto.decision ?? existing.decision ?? '').trim(),
						action: actionLine
					});
				} else {
					newRows.push({
						...defaultPtrRow(nextId++),
						refRisque: (carto.codeRisque ?? '').trim(),
						correspISO: (carto.mesureISO ?? '').toString().replace(/\n/g, ' '),
						proprietaire: (carto.proprietaireRisque ?? '').trim(),
						niveauRisque: getNiveauNet(carto) || '',
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
    /* Registre de classification : cellules plus hautes */
    .registre-classification-table tbody td {
        min-height: 104px;
        padding-top: 1rem;
        padding-bottom: 1rem;
        vertical-align: middle;
    }

    /* Section 7 – listes Impact D/I/C : select aussi haut que la cellule pour lire le contenu */
    .registre-classification-table .registre-loi0520-cell {
        height: 1px; /* allow child to set height */
    }
    .registre-classification-table .registre-loi0520-cell .registre-loi0520-select {
        font-size: 0.9rem;
        line-height: 1.4;
        min-height: 100%;
        height: 100%;
        padding: 0.5rem;
        display: block;
    }
    .registre-classification-table tbody tr .registre-loi0520-cell {
        height: auto;
        vertical-align: top;
    }
    .registre-classification-table tbody tr .registre-loi0520-cell .registre-loi0520-select {
        min-height: 96px;
        height: 96px;
    }

    /* Hide/show table cells (only tbody td/data cells, NOT headers).
       Keep all <thead> cells visible so headers display correctly for each view.
       Columns 4-5 (Description, Code Risque) always stay visible in ALL views.
       Column 46 = Actions (always visible in all views).
       Views: identification (1-20 + 46), brut (21-32 + 46), net (33-38 + 46), ptr (39-45 + 46).
    */

    /* Identification view: hide data columns 21-45, keep 1-20 and 46 (Actions) */
    .view-identification tbody tr td:nth-child(n+21):nth-child(-n+50) {
        display: none;
    }

    /* Risque Brut view: show cols 4-5 + 21-36 (3 DIC + 1 crit + 8 impacts + 4) + 51 Actions; hide 1-3, 6-20, 37-50 */
    .view-brut tbody tr td:nth-child(n+1):nth-child(-n+3),
    .view-brut tbody tr td:nth-child(n+6):nth-child(-n+20),
    .view-brut tbody tr td:nth-child(n+37):nth-child(-n+50) {
        display: none;
    }
    /* Colonnes d'impact en trop (au-delà de impactDefinitionsRows.length) : masquées */
    .carto-impact-col-hidden {
        display: none !important;
    }

    /* Degré + Risque Net view: show cols 4-5 + 37-42 + 51 (Actions), hide 1-3, 6-36, 43-50 */
    .view-net tbody tr td:nth-child(n+1):nth-child(-n+3),
    .view-net tbody tr td:nth-child(n+6):nth-child(-n+36),
    .view-net tbody tr td:nth-child(n+43):nth-child(-n+50) {
        display: none;
    }
    /* Version B (avec efficacité) : en vue Degré & Risque net, ne pas afficher la colonne Action PTR (col 38) */
    .view-net.net-version-b tbody tr td:nth-child(38) {
        display: none;
    }

    /* PTR + Résiduel view: brut section now 16 cols (21-36), net 6 (37-42), ptr 7 (43-49), actions 50. Show 4-5 + 43-49 + 51. */
    .view-ptr tbody tr td:nth-child(n+1):nth-child(-n+3),
    .view-ptr tbody tr td:nth-child(n+6):nth-child(-n+42) {
        display: none;
    }
    .view-ptr.ptr-version-b tbody tr td:nth-child(n+6):nth-child(-n+42) {
        display: table-cell;
    }
    .view-ptr.ptr-version-b tbody tr td:nth-child(n+6):nth-child(-n+41) {
        display: none;
    }

    /* Keep table layout predictable */
    table {
        table-layout: auto;
    }

    /* Increase cartographie table cell heights */
    .view-identification tbody tr,
    .view-brut tbody tr,
    .view-net tbody tr,
    .view-ptr tbody tr {
        min-height: 100px; /* Adjust as needed */
    }

    .view-identification tbody td,
    .view-brut tbody td,
    .view-net tbody td,
    .view-ptr tbody td {
        padding: 8px; /* Increased from py-2 (0.5rem) to 0.5rem */
    }

    /* Increase textarea height */
    .view-identification textarea,
    .view-brut textarea,
    .view-net textarea,
    .view-ptr textarea {
        min-height: 120px;
    }

    /* Version "Avec Efficacité" : aligner LARGEUR en-têtes et cellules */
    .carto-b-th {
        box-sizing: border-box;
        line-height: 1.2;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .carto-b-cell {
        box-sizing: border-box;
        overflow: hidden;
    }

    /* Modifiable text cells: no visible outline by default, show on hover/focus */
    main table input:not([type="checkbox"]),
    main table textarea {
        border: 1px solid transparent !important;
        outline: none !important;
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    main table input:not([type="checkbox"]):hover,
    main table input:not([type="checkbox"]):focus,
    main table textarea:hover,
    main table textarea:focus {
        border-color: #d1d5db !important; /* gray-300 */
        outline: none !important;
    }
    main table input:not([type="checkbox"]):focus,
    main table textarea:focus {
        box-shadow: 0 0 0 1px #d1d5db;
    }
</style>

<main class="p-6 space-y-8">
	<section class="space-y-2">
		<h1 class="text-2xl font-bold text-gray-900">Méthode personnalisée</h1>
		<p class="text-gray-600 max-w-3xl">
			Cette page regroupe les éléments de ta méthode personnalisée (contrôle du document, registre de classification,
			aides, cartographie des risques, PTR et échelle PTR). Les sections ci-dessous ne modifient
			pas le moteur de scoring standard de CISO Assistant, mais servent de guide pour la méthode de
			NearSecure.
		</p>
	</section>

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
			Échelle-PTR (Tables 1 à 4)
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
					on:click={() => (editModeControleDocument = !editModeControleDocument)}
				>
					{editModeControleDocument ? 'Terminer la modification' : 'Modifier'}
				</button>
			</div>
			
			<div class="space-y-2">
				<div class="p-4 bg-blue-50 border-l-4 border-blue-600">
					<p class="font-bold text-gray-900">REGISTRE DE CLASSIFICATION DES ACTIFS INFORMATIONNELS</p>
					<p class="font-bold text-gray-900">CARTOGRAPHIE D'ANALYSE DES RISQUES DE SÉCURITÉ SI</p>
				</div>
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
										{row.role}
									</td>
									<td class="px-4 py-2 text-black border border-gray-700 bg-white">
										{#if isEditing('redaction', i, 'nom')}
											<input
												use:focusInputOnMount
												class="w-full border border-gray-300 rounded px-2 py-1 text-sm"
												type="text"
												bind:value={redactionRows[i].nom}
												on:blur={stopEditing}
												on:keydown={(e) => e.key === 'Escape' && (editingCell = null)}
											/>
										{:else}
											<div
												role="button"
												tabindex="0"
												class="w-full px-2 py-1 text-sm border border-transparent rounded hover:border-gray-300 hover:bg-gray-50 cursor-text focus:outline-none focus:ring-1 focus:ring-sky-500 min-h-[28px]"
												on:click={() => startEditing('redaction', i, 'nom')}
												on:keydown={(e) => e.key === 'Enter' || e.key === ' ' ? (e.preventDefault(), startEditing('redaction', i, 'nom')) : null}
											>
												{row.nom || '\u00A0'}
											</div>
										{/if}
									</td>
									<td class="px-4 py-2 text-black border border-gray-700 bg-white">
										{#if isEditing('redaction', i, 'fonction')}
											<input
												use:focusInputOnMount
												class="w-full border border-gray-300 rounded px-2 py-1 text-sm"
												type="text"
												bind:value={redactionRows[i].fonction}
												on:blur={stopEditing}
												on:keydown={(e) => e.key === 'Escape' && (editingCell = null)}
											/>
										{:else}
											<div
												role="button"
												tabindex="0"
												class="w-full px-2 py-1 text-sm border border-transparent rounded hover:border-gray-300 hover:bg-gray-50 cursor-text focus:outline-none focus:ring-1 focus:ring-sky-500 min-h-[28px]"
												on:click={() => startEditing('redaction', i, 'fonction')}
												on:keydown={(e) => e.key === 'Enter' || e.key === ' ' ? (e.preventDefault(), startEditing('redaction', i, 'fonction')) : null}
											>
												{row.fonction || '\u00A0'}
											</div>
										{/if}
									</td>
									<td class="px-4 py-2 text-black border border-gray-700 bg-white">
										{#if isEditing('redaction', i, 'date')}
											<input
												use:focusInputOnMount
												class="w-full border border-gray-300 rounded px-2 py-1 text-sm"
												type="text"
												bind:value={redactionRows[i].date}
												on:blur={stopEditing}
												on:keydown={(e) => e.key === 'Escape' && (editingCell = null)}
											/>
										{:else}
											<div
												role="button"
												tabindex="0"
												class="w-full px-2 py-1 text-sm border border-transparent rounded hover:border-gray-300 hover:bg-gray-50 cursor-text focus:outline-none focus:ring-1 focus:ring-sky-500 min-h-[28px]"
												on:click={() => startEditing('redaction', i, 'date')}
												on:keydown={(e) => e.key === 'Enter' || e.key === ' ' ? (e.preventDefault(), startEditing('redaction', i, 'date')) : null}
											>
												{row.date || '\u00A0'}
											</div>
										{/if}
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
										/>
									</td>
									<td class="px-4 py-2 text-black border border-gray-700 bg-white">
										<input
											class="w-full border border-gray-300 rounded px-2 py-1 text-sm"
											type="text"
											bind:value={diffusionRows[i].entite_fonction}
										/>
									</td>
									<td class="px-4 py-2 text-black border border-gray-700 bg-white">
										<input
											class="w-full border border-gray-300 rounded px-2 py-1 text-sm"
											type="text"
											bind:value={diffusionRows[i].date}
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
										{#if isEditing('version', i, 'version')}
											<input
												use:focusInputOnMount
												class="w-full border border-gray-300 rounded px-2 py-1 text-sm"
												type="text"
												bind:value={versionRows[i].version}
												on:blur={stopEditing}
												on:keydown={(e) => e.key === 'Escape' && (editingCell = null)}
											/>
										{:else}
											<div
												role="button"
												tabindex="0"
												class="w-full px-2 py-1 text-sm border border-transparent rounded hover:border-gray-300 hover:bg-gray-50 cursor-text focus:outline-none focus:ring-1 focus:ring-sky-500 min-h-[28px]"
												on:click={() => startEditing('version', i, 'version')}
												on:keydown={(e) => e.key === 'Enter' || e.key === ' ' ? (e.preventDefault(), startEditing('version', i, 'version')) : null}
											>
												{row.version || '\u00A0'}
											</div>
										{/if}
									</td>
									<td class="px-4 py-2 text-black border border-gray-700 bg-white">
										{#if isEditing('version', i, 'date')}
											<input
												use:focusInputOnMount
												class="w-full border border-gray-300 rounded px-2 py-1 text-sm"
												type="text"
												bind:value={versionRows[i].date}
												on:blur={stopEditing}
												on:keydown={(e) => e.key === 'Escape' && (editingCell = null)}
											/>
										{:else}
											<div
												role="button"
												tabindex="0"
												class="w-full px-2 py-1 text-sm border border-transparent rounded hover:border-gray-300 hover:bg-gray-50 cursor-text focus:outline-none focus:ring-1 focus:ring-sky-500 min-h-[28px]"
												on:click={() => startEditing('version', i, 'date')}
												on:keydown={(e) => e.key === 'Enter' || e.key === ' ' ? (e.preventDefault(), startEditing('version', i, 'date')) : null}
											>
												{row.date || '\u00A0'}
											</div>
										{/if}
									</td>
									<td class="px-4 py-2 text-black border border-gray-700 bg-white">
										{#if isEditing('version', i, 'modification')}
											<input
												use:focusInputOnMount
												class="w-full border border-gray-300 rounded px-2 py-1 text-sm"
												type="text"
												bind:value={versionRows[i].modification}
												on:blur={stopEditing}
												on:keydown={(e) => e.key === 'Escape' && (editingCell = null)}
											/>
										{:else}
											<div
												role="button"
												tabindex="0"
												class="w-full px-2 py-1 text-sm border border-transparent rounded hover:border-gray-300 hover:bg-gray-50 cursor-text focus:outline-none focus:ring-1 focus:ring-sky-500 min-h-[28px]"
												on:click={() => startEditing('version', i, 'modification')}
												on:keydown={(e) => e.key === 'Enter' || e.key === ' ' ? (e.preventDefault(), startEditing('version', i, 'modification')) : null}
											>
												{row.modification || '\u00A0'}
											</div>
										{/if}
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
							<th class="px-2 py-2 text-center font-semibold text-black bg-amber-200 border border-black min-w-[90px]">Impact Disponibilité</th>
							<th class="px-2 py-2 text-center font-semibold text-black bg-amber-200 border border-black min-w-[90px]">Impact Intégrité</th>
							<th class="px-2 py-2 text-center font-semibold text-black bg-amber-200 border border-black min-w-[90px]">Impact Confidentialité</th>
							<th class="px-2 py-2 text-center font-semibold text-black bg-amber-200 border border-black min-w-[90px]">Sensibilité (réf. loi 05.20)</th>
							<th class="px-2 py-2 text-center font-semibold text-black bg-amber-200 border border-black min-w-[100px]">Confidentialité (décret 05-20)</th>
							{/if}
						</tr>
					</thead>
					<tbody>
						{#each registreRows as row, i}
							<tr class="border border-black">
								<!-- ID -->
								<td class="px-2 py-1 text-center border border-black bg-white">
									<input
										class="w-full text-center border border-gray-300 rounded px-1 py-0.5 text-xs"
										type="text"
										bind:value={registreRows[i].id}
									/>
								</td>
								<!-- Processus métier -->
								<td class="px-2 py-1 border border-black bg-white">
									<input
										class="w-full border border-gray-300 rounded px-1 py-0.5 text-xs"
										type="text"
										bind:value={registreRows[i].processus_metier}
									/>
								</td>
								<!-- Activité/Sous-processus -->
								<td class="px-2 py-1 border border-black bg-white">
									<input
										class="w-full border border-gray-300 rounded px-1 py-0.5 text-xs"
										type="text"
										bind:value={registreRows[i].activite_sous_processus}
									/>
								</td>
								<!-- Désignation de l'actif -->
								<td class="px-2 py-1 border border-black bg-white">
									<input
										class="w-full border border-gray-300 rounded px-1 py-0.5 text-xs"
										type="text"
										bind:value={registreRows[i].designation_actif}
									/>
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
										{#each categoriesActifsRows as categorie}
											<option value={categorie}>{categorie || '(vide)'}</option>
										{/each}
									</select>
								</td>
								<!-- Type de l'actif (automatique : Primaire si catégorie Document/Données, sinon Secondaire) -->
								<td class="px-2 py-1 border border-black bg-gray-50 text-xs">
									{registreRows[i].type_actif || '—'}
								</td>
								<!-- Propriétaire de l'actif (Section 5) -->
								<td class="px-2 py-1 border border-black bg-white">
									<input
										class="w-full border border-gray-300 rounded px-1 py-0.5 text-xs"
										type="text"
										bind:value={registreRows[i].proprietaire_actif}
										placeholder="Nom du propriétaire"
									/>
								</td>
								<!-- Disponibilité (Section 6) – options issues du Tableau 1.2 Aide-Classification -->
								<td class={`px-2 py-1 border border-black ${getNiveauBesoinBg(row.disponibilite)}`}>
									<select
										class="w-full border border-gray-300 rounded px-1 py-0.5 text-xs bg-transparent"
										bind:value={registreRows[i].disponibilite}
										on:change={() => calculerSensibilite(i)}
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
										on:change={() => calculerSensibilite(i)}
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
										on:change={() => calculerSensibilite(i)}
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
								<!-- Section 7 – Impact Disponibilité (loi 05.20) – couleur selon échelle TG/G/M/L -->
								<td class="px-2 py-1 border border-black registre-loi0520-cell" style="background-color: {getLoi0520ImpactBg(row.impactDispo0520) || '#ffffff'};">
									<select
										class="registre-loi0520-select w-full border border-gray-300 rounded px-2 bg-transparent"
										bind:value={registreRows[i].impactDispo0520}
										on:change={() => saveCustomMethodState()}
									>
										<option value="">--</option>
										{#each REGISTRE_LOI0520_OPTIONS as opt}
											<option value={opt}>{opt}</option>
										{/each}
									</select>
								</td>
								<!-- Section 7 – Impact Intégrité (loi 05.20) – couleur selon échelle TG/G/M/L -->
								<td class="px-2 py-1 border border-black registre-loi0520-cell" style="background-color: {getLoi0520ImpactBg(row.impactIntegrite0520) || '#ffffff'};">
									<select
										class="registre-loi0520-select w-full border border-gray-300 rounded px-2 bg-transparent"
										bind:value={registreRows[i].impactIntegrite0520}
										on:change={() => saveCustomMethodState()}
									>
										<option value="">--</option>
										{#each REGISTRE_LOI0520_OPTIONS as opt}
											<option value={opt}>{opt}</option>
										{/each}
									</select>
								</td>
								<!-- Section 7 – Impact Confidentialité (loi 05.20) – couleur selon échelle TG/G/M/L -->
								<td class="px-2 py-1 border border-black registre-loi0520-cell" style="background-color: {getLoi0520ImpactBg(row.impactConfid0520) || '#ffffff'};">
									<select
										class="registre-loi0520-select w-full border border-gray-300 rounded px-2 bg-transparent"
										bind:value={registreRows[i].impactConfid0520}
										on:change={() => saveCustomMethodState()}
									>
										<option value="">--</option>
										{#each REGISTRE_LOI0520_OPTIONS as opt}
											<option value={opt}>{opt}</option>
										{/each}
									</select>
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
		<section class="space-y-8">
			<h2 class="text-xl font-semibold text-gray-900">Aide-Classification</h2>

			<!-- Tableau 1 – Définitions générales D/I/C -->
			<section class="space-y-3">
				<h3 class="text-lg font-semibold text-gray-900">
					Tableau 1 – Disponibilité, Intégrité, Confidentialité (définitions générales)
				</h3>
				<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
					<table class="min-w-full text-sm border-collapse border border-black">
						<thead>
							<tr>
								{#each dicCriteriaRows as criteria, i}
									<th
										class="px-4 py-2 text-left font-semibold text-black border border-black bg-sky-200"
									>
										<input
											class="w-full border border-transparent bg-transparent font-semibold"
											type="text"
											bind:value={dicCriteriaRows[i].critere}
										/>
									</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							<tr class="border border-black">
								{#each dicCriteriaRows as criteria, i}
									<td class="px-4 py-2 text-black border border-black bg-white align-top min-h-[80px]">
										{#if isEditing('dicCriteria', 0, String(i))}
											<textarea
												use:focusTextareaOnMount
												class="w-full border border-gray-300 rounded px-2 py-1 text-sm min-h-[80px]"
												bind:value={dicCriteriaRows[i].definition}
												on:blur={stopEditing}
												on:keydown={(e) => e.key === 'Escape' && (editingCell = null)}
											></textarea>
										{:else}
											<div
												role="button"
												tabindex="0"
												class="w-full px-2 py-1 text-sm prose prose-sm max-w-none prose-p:my-1 text-left border border-transparent rounded hover:border-gray-300 hover:bg-gray-50 cursor-text focus:outline-none focus:ring-1 focus:ring-sky-500 min-h-[80px]"
												on:click={() => startEditing('dicCriteria', 0, String(i))}
												on:keydown={(e) => e.key === 'Enter' || e.key === ' ' ? (e.preventDefault(), startEditing('dicCriteria', 0, String(i))) : null}
											>
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

			<!-- Tableau 1.2 – Niveaux de valeur par critère (D / I / C) -->
			<section class="space-y-3">
				<div class="flex items-center justify-between gap-4 flex-wrap">
					<h3 class="text-lg font-semibold text-gray-900">
						Tableau 1.2 – Niveaux de valeur par critère (D / I / C)
					</h3>
					<button
						type="button"
						class="px-3 py-1.5 text-sm rounded {editModeTable12
							? 'bg-gray-600 text-white hover:bg-gray-700'
							: 'bg-sky-600 text-white hover:bg-sky-700'}"
						on:click={() => (editModeTable12 = !editModeTable12)}
					>
						{editModeTable12 ? 'Terminer la modification' : 'Modifier'}
					</button>
				</div>
				<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
					<table class="min-w-full text-sm border-collapse border border-black">
						<thead>
							<tr>
								<th
									class="px-4 py-2 text-left font-semibold text-black bg-sky-200 border border-black"
								>
									Valeur
								</th>
								{#if editModeTable12}
									<th
										class="px-2 py-2 text-center font-semibold text-black bg-sky-200 border border-black min-w-[120px]"
									>
										Couleur
									</th>
								{/if}
								<th
									class="px-4 py-2 text-left font-semibold text-black bg-sky-200 border border-black"
								>
									Disponibilité (D)
								</th>
								<th
									class="px-4 py-2 text-left font-semibold text-black bg-sky-200 border border-black"
								>
									Intégrité (I)
								</th>
								<th
									class="px-4 py-2 text-left font-semibold text-black bg-sky-200 border border-black"
								>
									Confidentialité (C)
								</th>
								{#if editModeTable12}
									<th class="px-2 py-2 text-center font-semibold text-black bg-sky-200 border border-black">Actions</th>
								{/if}
							</tr>
						</thead>
						<tbody>
							{#each dicNiveauxRows as row, i}
								<tr class="border border-black">
									<td
										class={`px-4 py-2 font-semibold text-white border border-black ${getValeurBg(row.valeur)}`}
									>
										<input
											class="w-full border border-transparent bg-transparent font-semibold text-white placeholder-white/70"
											type="text"
											bind:value={dicNiveauxRows[i].valeur}
											on:change={() => saveCustomMethodState()}
										/>
									</td>
									{#if editModeTable12}
										<td class="px-2 py-2 border border-black bg-gray-50 align-middle">
											<select
												class="w-full border border-gray-300 rounded px-1 py-0.5 text-xs"
												bind:value={dicNiveauxRows[i].bgColor}
												on:change={() => saveCustomMethodState()}
											>
												{#each DIC_NIVEAU_COULEURS as c}
													<option value={c}>{c}</option>
												{/each}
											</select>
										</td>
									{/if}
									<td class="px-4 py-2 text-black border border-black bg-white align-top text-xs min-h-[100px]">
										{#if isEditing('dicNiveaux', i, 'disponibilite')}
											<textarea
												use:focusTextareaOnMount
												class="w-full border border-gray-300 rounded px-2 py-1 text-xs min-h-[100px]"
												bind:value={dicNiveauxRows[i].disponibilite}
												on:blur={stopEditing}
												on:keydown={(e) => e.key === 'Escape' && (editingCell = null)}
											></textarea>
										{:else}
											<div
												role="button"
												tabindex="0"
												class="w-full px-2 py-1 text-xs prose prose-sm max-w-none prose-p:my-1 text-left border border-transparent rounded hover:border-gray-300 hover:bg-gray-50 cursor-text focus:outline-none focus:ring-1 focus:ring-sky-500"
												on:click={() => startEditing('dicNiveaux', i, 'disponibilite')}
												on:keydown={(e) => e.key === 'Enter' || e.key === ' ' ? (e.preventDefault(), startEditing('dicNiveaux', i, 'disponibilite')) : null}
											>
												{@html row.disponibilite ?? ''}
											</div>
										{/if}
									</td>
									<td class="px-4 py-2 text-black border border-black bg-white align-top text-xs min-h-[100px]">
										{#if isEditing('dicNiveaux', i, 'integrite')}
											<textarea
												use:focusTextareaOnMount
												class="w-full border border-gray-300 rounded px-2 py-1 text-xs min-h-[100px]"
												bind:value={dicNiveauxRows[i].integrite}
												on:blur={() => { editingDicNiveaux = null; saveCustomMethodState(); }}
												on:keydown={(e) => e.key === 'Escape' && (editingDicNiveaux = null)}
											></textarea>
										{:else}
											<div
												role="button"
												tabindex="0"
												class="w-full px-2 py-1 text-xs prose prose-sm max-w-none prose-p:my-1 text-left border border-transparent rounded hover:border-gray-300 hover:bg-gray-50 cursor-text focus:outline-none focus:ring-1 focus:ring-sky-500"
												on:click={() => editingDicNiveaux = { row: i, field: 'integrite' }}
												on:keydown={(e) => e.key === 'Enter' || e.key === ' ' ? (e.preventDefault(), editingDicNiveaux = { row: i, field: 'integrite' }) : null}
											>
												{@html row.integrite ?? ''}
											</div>
										{/if}
									</td>
									<td class="px-4 py-2 text-black border border-black bg-white align-top text-xs min-h-[100px]">
										{#if isEditing('dicNiveaux', i, 'confidentialite')}
											<textarea
												use:focusTextareaOnMount
												class="w-full border border-gray-300 rounded px-2 py-1 text-xs min-h-[100px]"
												bind:value={dicNiveauxRows[i].confidentialite}
												on:blur={stopEditing}
												on:keydown={(e) => e.key === 'Escape' && (editingCell = null)}
											></textarea>
										{:else}
											<div
												role="button"
												tabindex="0"
												class="w-full px-2 py-1 text-xs prose prose-sm max-w-none prose-p:my-1 text-left border border-transparent rounded hover:border-gray-300 hover:bg-gray-50 cursor-text focus:outline-none focus:ring-1 focus:ring-sky-500"
												on:click={() => startEditing('dicNiveaux', i, 'confidentialite')}
												on:keydown={(e) => e.key === 'Enter' || e.key === ' ' ? (e.preventDefault(), startEditing('dicNiveaux', i, 'confidentialite')) : null}
											>
												{@html row.confidentialite ?? ''}
											</div>
										{/if}
									</td>
									{#if editModeTable12}
										<td class="px-2 py-2 border border-black bg-gray-100">
											<div class="flex gap-1 justify-center flex-wrap">
												<button
													type="button"
													class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
													on:click={() => insererNiveauDicAvant(i)}
													title="Ajouter avant"
												>
													↑+
												</button>
												<button
													type="button"
													class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
													on:click={() => insererNiveauDicApres(i)}
													title="Ajouter après"
												>
													↓+
												</button>
												<button
													type="button"
													class="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
													on:click={() => supprimerNiveauDic(i)}
													title="Supprimer"
													disabled={dicNiveauxRows.length <= 1}
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
				{#if editModeTable12}
					<div class="flex gap-2">
						<button
							type="button"
							class="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700"
							on:click={ajouterNiveauDic}
						>
							+ Ajouter un niveau
						</button>
					</div>
				{/if}
			</section>

			<!-- Tableau 2 – Catégories d'actifs -->
			<section class="space-y-3">
				<div class="flex items-center justify-between gap-4 flex-wrap">
					<h3 class="text-lg font-semibold text-gray-900">Tableau 2 – Catégories d'actifs</h3>
					<button
						type="button"
						class="px-3 py-1.5 text-sm rounded {editModeTable2Categories
							? 'bg-gray-600 text-white hover:bg-gray-700'
							: 'bg-sky-600 text-white hover:bg-sky-700'}"
						on:click={() => (editModeTable2Categories = !editModeTable2Categories)}
					>
						{editModeTable2Categories ? 'Terminer la modification' : 'Modifier'}
					</button>
				</div>
				<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
					<table class="min-w-full text-sm border-collapse border border-black">
						<thead>
							<tr>
								<th
									class="px-4 py-3 text-left font-semibold text-black bg-sky-200 border border-black"
								>
									Catégories d'actifs
								</th>
								{#if editModeTable2Categories}
								<th class="px-4 py-3 text-left font-semibold text-black bg-sky-200 border border-black">Actions</th>
								{/if}
							</tr>
						</thead>
						<tbody>
							{#each categoriesActifsRows as categorie, i}
								<tr class="border border-black">
									<td class="px-4 py-2 text-black border border-black bg-white text-center">
										<input
											class="w-full border border-gray-300 rounded px-2 py-1 text-sm text-center"
											type="text"
											bind:value={categoriesActifsRows[i]}
										/>
									</td>
									{#if editModeTable2Categories}
									<td class="px-4 py-2 border border-black bg-gray-100">
										<div class="flex gap-1 justify-center">
											<button
												type="button"
												class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
												on:click={() => insererCategorieActifAvant(i)}
												title="Ajouter avant"
											>
												↑+
											</button>
											<button
												type="button"
												class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
												on:click={() => insererCategorieActifApres(i)}
												title="Ajouter après"
											>
												↓+
											</button>
											<button
												type="button"
												class="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
												on:click={() => supprimerCategorieActif(i)}
												title="Supprimer"
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
				{#if editModeTable2Categories}
				<div class="flex gap-2">
					<button
						type="button"
						class="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700"
						on:click={ajouterCategorieActif}
					>
						+ Ajouter une ligne
					</button>
					{#if categoriesActifsRows.length > 1}
						<button
							type="button"
							class="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700"
							on:click={() => supprimerCategorieActif(categoriesActifsRows.length - 1)}
						>
							- Supprimer la dernière ligne
						</button>
					{/if}
				</div>
				{/if}
			</section>

			<!-- Tableau 3 – Propriétaires des actifs -->
			<section class="space-y-3">
				<h3 class="text-lg font-semibold text-gray-900">Tableau 3 – Propriétaires des actifs</h3>
				<div
					class="rounded-lg border-2 border-green-600 bg-green-50 p-4 shadow-sm flex gap-4 items-start"
				>
					<div class="bg-white px-4 py-2 rounded border border-green-400 flex-shrink-0">
						<p class="font-semibold text-gray-900">Propriétaires des actifs</p>
					</div>
					<div class="flex-1">
						<p class="text-sm text-gray-800">
							Chaque actif informationnel doit être attribué formellement à un propriétaire qui a
							la responsabilité de la gestion des actifs informationnels qui lui sont attribués
							(inventaire, classification, protection, destruction, réforme …) tout au long de
							leurs cycles de vie.
						</p>
					</div>
				</div>
			</section>

			<!-- Classification selon la loi n° 05-20 -->
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
								<th colspan={11 + 8 + (editModeCarto ? 1 : 0)} class="px-4 py-3 text-center font-bold text-lg text-black bg-yellow-400 border border-black">
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
								{#each Array(8) as _, idx}
									<th class="px-2 py-3 text-center font-bold text-white bg-orange-600 border border-black col-brut-impact {idx >= impactDefinitionsRows.length ? 'carto-impact-col-hidden' : ''}" style="min-width: 90px;">{impactDefinitionsRows[idx]?.libelle || 'Impact'}</th>
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
									<th class="carto-b-th px-1 py-1 text-center font-bold text-black bg-yellow-400 border border-black text-xs" style="width: 130px; max-width: 130px;">Niveau d'eff.</th>
									<th class="carto-b-th px-1 py-1 text-center font-bold text-black bg-yellow-400 border border-black text-xs" style="width: 130px; max-width: 130px;">Niveau risque</th>
									<th class="carto-b-th px-1 py-1 text-center font-bold text-black bg-yellow-400 border border-black text-xs" style="width: 130px; max-width: 130px;">Signif. risque net</th>
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
									<th class="carto-b-th px-1 py-1 text-center font-bold text-black bg-yellow-400 border border-black text-xs" style="width: 130px; max-width: 130px;">% efficacité</th>
									<th class="carto-b-th px-1 py-1 text-center font-bold text-black bg-yellow-400 border border-black text-xs" style="width: 130px; max-width: 130px;">Niveau risque</th>
									<th class="carto-b-th px-1 py-1 text-center font-bold text-black bg-yellow-400 border border-black text-xs" style="width: 130px; max-width: 130px;">Niv. risque résiduel</th>
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
								<th colspan={(cartoVersion === 'B' ? 47 : 49) + (editModeCarto ? 1 : 0)} class="px-4 py-3 text-center font-bold text-lg text-black border border-black bg-white">
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
						<th colspan={(cartoVersion === 'B' ? 47 : 49) + (editModeCarto ? 1 : 0)} class="px-4 py-3 text-center font-bold text-lg text-black border border-black bg-white">
							CARTOGRAPHIE DES RISQUES DE SECURITÉ DES SYSTÈMES D'INFORMATION
						</th>
					</tr>
					
					<!-- Ligne 5: Sections principales -->
					<tr>
						<th colspan="3" class="px-2 py-3 text-center font-bold text-black bg-white border border-black">
							Cartographie des Processus
						</th>
						<th colspan="17" class="px-2 py-3 text-center font-bold text-white bg-teal-700 border border-black">
							Identification des risques inhérents
						</th>
						<th colspan="16" class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black">
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
						{#each Array(8) as _, idx}
							<th rowspan="2" class="px-2 py-3 text-center font-bold text-white bg-orange-600 border border-black {idx >= impactDefinitionsRows.length ? 'carto-impact-col-hidden' : ''}" style="min-width: 80px;">{impactDefinitionsRows[idx]?.libelle || 'Impact'}</th>
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
						
						<!-- Dispositif -->
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-white bg-teal-700 border border-black" style="min-width: 200px;">
							Description du Dispositif de Maitrise des Risques
						</th>
						
						<!-- Risque Net : Version A ou B -->
						{#if cartoVersion === 'A'}
							<th rowspan="2" class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black" style="min-width: 120px;">Criticité de l'actif - Besoin en SSI</th>
							<th rowspan="2" class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black" style="min-width: 95px;">Gravité des impacts</th>
							<th rowspan="2" class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black" style="min-width: 95px;">Probabilité<br/>d'Occurrence</th>
							<th rowspan="2" class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black" style="min-width: 85px;">I*P*C</th>
							<th rowspan="2" class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black" style="min-width: 120px;">Signification du risque net</th>
						{:else}
							<th rowspan="2" class="carto-b-th px-1 py-1 text-center font-bold text-black bg-yellow-400 border border-black text-xs whitespace-nowrap" style="width: 130px; max-width: 130px;">Efficacité DMR</th>
							<th rowspan="2" class="carto-b-th px-1 py-1 text-center font-bold text-black bg-yellow-400 border border-black text-xs" style="width: 130px; max-width: 130px;">Niveau d'eff.</th>
							<th rowspan="2" class="carto-b-th px-1 py-1 text-center font-bold text-black bg-yellow-400 border border-black text-xs" style="width: 130px; max-width: 130px;">Niveau risque</th>
							<th rowspan="2" class="carto-b-th px-1 py-1 text-center font-bold text-black bg-yellow-400 border border-black text-xs" style="width: 130px; max-width: 130px;">Signif. risque net</th>
						{/if}
						<!-- PTR -->
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-white bg-gray-600 border border-black" style="min-width: 100px;">Décision</th>
						<th rowspan="2" class="px-2 py-3 text-center font-bold text-white bg-gray-600 border border-black" style="min-width: 200px;">Action à mettre en place</th>
						<!-- Risque Résiduel : Version A ou B -->
						{#if cartoVersion === 'A'}
							<th rowspan="2" class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black" style="min-width: 120px;">Criticité de l'actif - Besoin en SSI</th>
							<th rowspan="2" class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black" style="min-width: 85px;">Gravité des impacts</th>
							<th rowspan="2" class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black" style="min-width: 95px;">Probabilité d'occurrence</th>
							<th rowspan="2" class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black" style="min-width: 85px;">I*P*C</th>
							<th rowspan="2" class="px-2 py-3 text-center font-bold text-black bg-yellow-400 border border-black" style="min-width: 120px;">Niveau du risque résiduel</th>
						{:else}
							<th rowspan="2" class="carto-b-th px-1 py-1 text-center font-bold text-black bg-yellow-400 border border-black text-xs" style="width: 130px; max-width: 130px;">Efficacité PTR</th>
							<th rowspan="2" class="carto-b-th px-1 py-1 text-center font-bold text-black bg-yellow-400 border border-black text-xs" style="width: 130px; max-width: 130px;">Niveau d'efficacité</th>
							<th rowspan="2" class="carto-b-th px-1 py-1 text-center font-bold text-black bg-yellow-400 border border-black text-xs" style="width: 130px; max-width: 130px;">Niveau risque</th>
							<th rowspan="2" class="carto-b-th px-1 py-1 text-center font-bold text-black bg-yellow-400 border border-black text-xs" style="width: 130px; max-width: 130px;">Niv. risque résiduel</th>
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
							<tr class="bg-teal-700">
								<td colspan={(cartoVersion === 'B' ? 47 : 49) + (editModeCarto ? 1 : 0)} class="px-3 py-3 font-bold text-white border border-black">{CARTO_PART_TITLES[part] || 'Autres'}</td>
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
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 font-bold resize-none" rows="4" bind:value={row.mesureISO} on:blur={() => saveCustomMethodState()}></textarea>
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
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" bind:checked={row.actifMateriel} on:change={() => saveCustomMethodState()} /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" bind:checked={row.actifApplication} on:change={() => saveCustomMethodState()} /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" bind:checked={row.actifEquipementsSecurite} on:change={() => saveCustomMethodState()} /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" bind:checked={row.actifEquipementsReseaux} on:change={() => saveCustomMethodState()} /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" bind:checked={row.actifRessourcesHumaines} on:change={() => saveCustomMethodState()} /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" bind:checked={row.actifDocument} on:change={() => saveCustomMethodState()} /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" bind:checked={row.actifDonnees} on:change={() => saveCustomMethodState()} /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" bind:checked={row.dicD} on:change={() => saveCustomMethodState()} /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" bind:checked={row.dicI} on:change={() => saveCustomMethodState()} /></td>
						<td class="px-2 py-3 text-center border border-black bg-white align-middle"><input type="checkbox" class="w-4 h-4" bind:checked={row.dicC} on:change={() => saveCustomMethodState()} /></td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full min-w-12 text-xs p-1 text-center bg-transparent" min="1" max="4" bind:value={row.impactD} on:change={() => saveCustomMethodState()} />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full min-w-12 text-xs p-1 text-center bg-transparent" min="1" max="4" bind:value={row.impactI} on:change={() => saveCustomMethodState()} />
						</td>
						<td class="px-2 py-2 text-center border border-black bg-gray-100 align-middle">
							<input type="number" class="w-full min-w-12 text-xs p-1 text-center bg-transparent" min="1" max="4" bind:value={row.impactC} on:change={() => saveCustomMethodState()} />
						</td>
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">{getCriticite(row) ?? '-'}</td>
						{#each Array(8) as _, idx}
							<td class="px-2 py-2 border border-black bg-white align-middle col-brut-impact {idx >= impactDefinitionsRows.length ? 'carto-impact-col-hidden' : ''}">
								{#if idx < impactDefinitionsRows.length}
									<input type="number" class="w-full text-xs p-1 text-center min-w-[2rem]" min="1" max="6" value={getRowImpacts(row)[idx]} on:input={(e) => { const v = (e.target as HTMLInputElement).value; if (!row.impacts || row.impacts.length !== impactDefinitionsRows.length) row.impacts = getRowImpacts(row); row.impacts[idx] = v; saveCustomMethodState(); }} />
								{:else}
									<span></span>
								{/if}
							</td>
						{/each}
						<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">{getGravite(row) ?? '-'}</td>
						<td class="px-2 py-2 border border-black bg-white align-middle">
							<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" bind:value={row.probabilite} on:change={() => saveCustomMethodState()} />
						</td>
						<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">{getIpcBrut(row) ?? '-'}</td>
						<td class="px-2 py-2 text-center font-bold border border-black text-xs align-middle {getNiveauRisqueBg(getNiveauBrut(row))}">{getNiveauBrut(row)}</td>
						<td class="px-2 py-2 border border-black bg-white align-top">
							<textarea class="w-full text-xs p-1 resize-none" rows="6" placeholder="Description du dispositif..." bind:value={row.dispositifMaitrise} on:blur={() => saveCustomMethodState()}></textarea>
						</td>
						{#if cartoVersion === 'A'}
							<td class="px-2 py-2 text-center font-bold border border-black bg-yellow-200 align-middle">{getCriticite(row) ?? '-'}</td>
							<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
								<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="6" bind:value={row.graviteNet} on:change={() => saveCustomMethodState()} />
							</td>
							<td class="px-2 py-2 border border-black bg-yellow-200 align-middle">
								<input type="number" class="w-full text-xs p-1 text-center bg-transparent" min="1" max="5" bind:value={row.probabiliteNet} on:change={() => saveCustomMethodState()} />
							</td>
							<td class="px-2 py-2 text-center font-bold border border-black bg-orange-200 align-middle">{getIpcNet(row) ?? '-'}</td>
							<td class="px-2 py-2 text-center font-bold border border-black text-xs align-middle {getNiveauRisqueBg(getNiveauNet(row))}">{getNiveauNet(row)}</td>
						{:else}
							<!-- AJ : Efficacité DMR (saisie 1-5) -->
							<td class="carto-b-cell px-1 py-3 border border-black bg-white align-middle" style="width: 130px; max-width: 130px;">
								<input type="number" class="w-full text-xs p-1 text-center max-w-[100px] mx-auto" min="1" max="5" placeholder="1-5" bind:value={row.efficaciteDMR} on:change={() => saveCustomMethodState()} />
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
								<input type="number" class="w-full text-xs p-1 text-center" min="1" max="6" bind:value={row.impactResiduel} on:change={() => saveCustomMethodState()} />
							</td>
							<td class="px-2 py-2 border border-black bg-white align-middle">
								<input type="number" class="w-full text-xs p-1 text-center" min="1" max="5" bind:value={row.vraisemblanceResiduel} on:change={() => saveCustomMethodState()} />
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
		<section class="space-y-8">
			<div class="flex items-center justify-between gap-4 flex-wrap">
				<h2 class="text-xl font-semibold text-gray-900">Aide-Risque</h2>
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
								{#if editModeAideRisque}
									<th class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">Couleur</th>
									<th class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">Actions</th>
								{/if}
							</tr>
						</thead>
						<tbody>
							{#each probaRows as row, i}
								<tr class="border border-black">
									<td class="px-4 py-2 text-black border border-black bg-white">
										<input class="w-full border border-gray-300 rounded px-2 py-1 text-sm" type="text" bind:value={probaRows[i].echelle} />
									</td>
									<td class={`px-4 py-2 border border-black ${getProbaRowBg(row)}`}>
										<input class="w-full border border-transparent bg-transparent font-semibold" type="text" bind:value={probaRows[i].definition} />
									</td>
									<td class="px-4 py-2 text-black border border-black bg-white align-top">
										<textarea class="w-full border border-gray-300 rounded px-2 py-1 text-xs min-h-[60px]" bind:value={probaRows[i].frequence}></textarea>
									</td>
									<td class="px-4 py-2 text-black border border-black bg-white align-top">
										<textarea class="w-full border border-gray-300 rounded px-2 py-1 text-xs min-h-[60px]" bind:value={probaRows[i].historique}></textarea>
									</td>
									{#if editModeAideRisque}
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
				{#if editModeAideRisque}
					<div class="flex gap-2 mt-2">
						<button type="button" class="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700" on:click={ajouterProba}>+ Ajouter une ligne</button>
						{#if probaRows.length > 1}
							<button type="button" class="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerProba(probaRows.length - 1)}>- Supprimer la dernière ligne</button>
						{/if}
					</div>
				{/if}
			</section>

			<!-- Tableau 2 – Échelle d'impact -->
			<section class="space-y-3">
				<h3 class="text-lg font-semibold text-gray-900">Tableau 2&nbsp;: Échelle d'impact</h3>
				<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
					<table class="min-w-full text-sm border-collapse border border-black">
						<thead>
							<tr>
								<th class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">Échelle</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">Définition</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">Financier</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">Réputation</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">Parties prenantes</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">Réglementaire</th>
								{#if editModeAideRisque}
									<th class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">Couleur</th>
									<th class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">Actions</th>
								{/if}
							</tr>
						</thead>
						<tbody>
							{#each impactRows as row, i}
								<tr class="border border-black">
									<td class="px-4 py-2 text-black border border-black bg-white">
										<input class="w-full border border-gray-300 rounded px-2 py-1 text-sm" type="text" bind:value={impactRows[i].echelle} />
									</td>
									<td class={`px-4 py-2 border border-black ${getImpactRowBg(row)}`}>
										<input class="w-full border border-transparent bg-transparent font-semibold" type="text" bind:value={impactRows[i].definition} />
									</td>
									<td class="px-4 py-2 text-black border border-black bg-white align-top">
										<textarea class="w-full border border-gray-300 rounded px-2 py-1 text-xs min-h-[60px]" bind:value={impactRows[i].financier}></textarea>
									</td>
									<td class="px-4 py-2 text-black border border-black bg-white align-top">
										<textarea class="w-full border border-gray-300 rounded px-2 py-1 text-xs min-h-[60px]" bind:value={impactRows[i].reputation}></textarea>
									</td>
									<td class="px-4 py-2 text-black border border-black bg-white align-top">
										<textarea class="w-full border border-gray-300 rounded px-2 py-1 text-xs min-h-[60px]" bind:value={impactRows[i].parties_prenantes}></textarea>
									</td>
									<td class="px-4 py-2 text-black border border-black bg-white align-top">
										<textarea class="w-full border border-gray-300 rounded px-2 py-1 text-xs min-h-[60px]" bind:value={impactRows[i].reglementaire}></textarea>
									</td>
									{#if editModeAideRisque}
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
				{#if editModeAideRisque}
					<div class="flex gap-2 mt-2">
						<button type="button" class="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700" on:click={ajouterImpact}>+ Ajouter une ligne</button>
						{#if impactRows.length > 1}
							<button type="button" class="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerImpact(impactRows.length - 1)}>- Supprimer la dernière ligne</button>
						{/if}
					</div>
				{/if}
				<p class="text-xs text-gray-600">
					Les mots‑clés <strong>Financier</strong>, <strong>Réputation</strong>,
					<strong>Parties prenantes</strong> et <strong>Réglementaire</strong> doivent être
					considérés comme des axes d'analyse principaux.
				</p>
			</section>

			<!-- Tableau 2.1 – Définition des impacts (Évaluation de la Criticité du Risque Brut) -->
			<section class="space-y-3">
				<h3 class="text-lg font-semibold text-gray-900">Définition des impacts</h3>
				<p class="text-sm text-gray-600">
					Ce tableau définit les types d'impacts utilisés dans l'évaluation de la criticité du risque brut. Les libellés et définitions sont repris dans la cartographie des risques (colonnes Impact). Modifier ce tableau ajoute ou supprime des colonnes dans la cartographie.
				</p>
				<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
					<table class="min-w-full text-sm border-collapse border border-black">
						<thead>
							<tr>
								<th class="px-4 py-2 text-left font-semibold text-white bg-orange-600 border border-black">Libellé (Impact)</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-orange-600 border border-black">Définition</th>
								{#if editModeAideRisque}
									<th class="px-4 py-2 text-center font-semibold text-white bg-orange-600 border border-black">Actions</th>
								{/if}
							</tr>
						</thead>
						<tbody>
							{#each impactDefinitionsRows as def, i}
								<tr class="border border-black">
									<td class="px-4 py-2 text-black border border-black bg-white">
										<input class="w-full border border-gray-300 rounded px-2 py-1 text-sm" type="text" bind:value={impactDefinitionsRows[i].libelle} placeholder="Ex. Impact Financier" on:change={() => saveCustomMethodState()} />
									</td>
									<td class="px-4 py-2 text-black border border-black bg-white align-top">
										<textarea class="w-full border border-gray-300 rounded px-2 py-1 text-xs min-h-[60px]" bind:value={impactDefinitionsRows[i].definition} placeholder="Explication de l'impact..." on:blur={() => saveCustomMethodState()}></textarea>
									</td>
									{#if editModeAideRisque}
										<td class="px-4 py-2 border border-black bg-gray-100 text-center">
											<div class="flex gap-1 justify-center flex-wrap">
												<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => { impactDefinitionsRows = insererLigneAvant(impactDefinitionsRows, i, { libelle: '', definition: '' }); syncCartoRowsImpacts(); saveCustomMethodState(); }} title="Ajouter avant">↑+</button>
												<button type="button" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" on:click={() => { impactDefinitionsRows = insererLigneApres(impactDefinitionsRows, i, { libelle: '', definition: '' }); syncCartoRowsImpacts(); saveCustomMethodState(); }} title="Ajouter après">↓+</button>
												<button type="button" class="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerDefinitionImpact(i)} title="Supprimer" disabled={impactDefinitionsRows.length <= 1}>✕</button>
											</div>
										</td>
									{/if}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				{#if editModeAideRisque}
					<div class="flex gap-2 mt-2">
						<button type="button" class="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed" on:click={ajouterDefinitionImpact} disabled={impactDefinitionsRows.length >= 8} title={impactDefinitionsRows.length >= 8 ? 'Maximum 8 impacts (colonnes cartographie)' : ''}>+ Ajouter une ligne</button>
						{#if impactDefinitionsRows.length > 1}
							<button type="button" class="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerDefinitionImpact(impactDefinitionsRows.length - 1)}>- Supprimer la dernière ligne</button>
						{/if}
					</div>
				{/if}
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
								<th colspan={editModeAideRisque ? 5 : 3} class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">
									Fréquence / Probabilité d'occurrence
								</th>
							</tr>
							<tr>
								<th class="px-4 py-2 text-left font-semibold text-white bg-slate-900 border border-black">Échelle</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-slate-900 border border-black">Définition</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-slate-900 border border-black">Signification</th>
								{#if editModeAideRisque}
									<th class="px-4 py-2 text-left font-semibold text-white bg-slate-900 border border-black">Couleur</th>
									<th class="px-4 py-2 text-left font-semibold text-white bg-slate-900 border border-black">Actions</th>
								{/if}
							</tr>
						</thead>
						<tbody>
							{#each frequenceRisqueRows as row, i}
								<tr class="border border-black">
									<td class="px-4 py-2 text-black border border-black bg-white">
										<input class="w-full border border-gray-300 rounded px-2 py-1 text-sm" type="text" bind:value={frequenceRisqueRows[i].echelle} />
									</td>
									<td class={`px-4 py-2 border border-black ${getFrequenceRowBg(row)}`}>
										<input class="w-full border border-transparent bg-transparent font-semibold" type="text" bind:value={frequenceRisqueRows[i].definition} />
									</td>
									<td class="px-4 py-2 text-black border border-black bg-white">
										<input class="w-full border border-gray-300 rounded px-2 py-1 text-sm" type="text" bind:value={frequenceRisqueRows[i].signification} />
									</td>
									{#if editModeAideRisque}
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
				{#if editModeAideRisque}
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
										{#if editModeAideRisque && getMatriceColumnCount() > 1}
											<button type="button" class="absolute -top-0.5 -right-0.5 w-5 h-5 text-[10px] bg-red-600 text-white rounded-full hover:bg-red-700 leading-none" title="Supprimer cette colonne" on:click={() => supprimerColonneMatrice(colIndex)}>✕</button>
										{/if}
									</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each matriceRisqueRows as row, i}
								<tr class="border border-black">
									<td class="px-2 py-2 text-sm border border-black bg-white">
										<input class="w-20 border border-gray-300 rounded px-1 py-0.5 text-sm" type="text" bind:value={matriceRisqueRows[i].libelle} />
									</td>
									{#each row.valeurs as v, j}
										<td class={`px-2 py-2 text-xs text-center border border-black ${getMatriceCellBgFromFrequence(v)}`}>
											<input class="w-16 text-center border border-gray-300 rounded px-1 py-0.5 text-xs bg-transparent" type="number" bind:value={matriceRisqueRows[i].valeurs[j]} />
										</td>
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				{#if editModeAideRisque}
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
					<table class="min-w-full text-sm border-collapse border border-black" style="table-layout: fixed;">
						<colgroup>
							<col style="width: 3rem;" />
							<col style="width: 6rem;" />
							<col style="width: 38px;" />
							<col style="width: 38px;" />
							<col style="width: 38px;" />
							<col style="width: 8rem;" />
							<col style="width: 4rem;" />
							{#if editModeAideRisque}
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
								{#if editModeAideRisque}
									<th class="px-3 py-2.5 text-center text-[11px] font-bold text-white border border-black whitespace-nowrap" style="background-color: #263c18;">Couleur</th>
									<th class="px-3 py-2.5 text-center text-[11px] font-bold text-white border border-black whitespace-nowrap" style="background-color: #263c18;">Actions</th>
								{/if}
							</tr>
						</thead>
						<tbody>
							{#each efficaciteRows as row, i}
								<tr class="border border-black">
									<td class="px-3 py-2 text-center border border-black bg-white">
										<input class="w-full border border-gray-300 rounded px-2 py-1 text-sm font-bold text-center" type="text" bind:value={efficaciteRows[i].niveau} />
									</td>
									<td class={`px-3 py-2 text-center font-bold border border-black ${getEfficaciteRowBg(row)}`}>
										<input class="w-full border border-transparent bg-transparent font-semibold text-center" type="text" bind:value={efficaciteRows[i].signification} />
									</td>
									<td colspan="3" class="px-3 py-3 text-left align-middle border border-black bg-white min-h-[140px] overflow-hidden">
										<textarea class="w-full min-h-[120px] min-w-0 border border-gray-300 rounded px-2 py-1.5 text-base whitespace-pre-wrap" bind:value={efficaciteRows[i].descriptif} placeholder="Descriptif du niveau…"></textarea>									</td>
									<td class="px-3 py-2 text-center border border-black bg-white">
										<input class="w-full border border-gray-300 rounded px-2 py-1 text-sm font-bold text-center" type="text" bind:value={efficaciteRows[i].intervalle} placeholder="0 % – 30 %" />
									</td>
									<td class="px-3 py-2 text-center border border-black bg-white">
										<input class="w-full border border-gray-300 rounded px-2 py-1 text-sm text-center" type="text" inputmode="decimal" bind:value={efficaciteRows[i].valeur} placeholder="0.15" />
									</td>
									{#if editModeAideRisque}
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
				{#if editModeAideRisque}
					<div class="flex gap-2 mt-2">
						<button type="button" class="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700" on:click={ajouterEfficacite}>+ Ajouter une ligne</button>
						{#if efficaciteRows.length > 1}
							<button type="button" class="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700" on:click={() => supprimerEfficacite(efficaciteRows.length - 1)}>- Supprimer la dernière ligne</button>
						{/if}
					</div>
				{/if}
				<p class="text-xs text-gray-600">
					Échelle de risque (feu tricolore étendu)&nbsp;: <span class="font-semibold" style="color: #ff0000;">Rouge</span> (Insuffisant) – Risque très élevé,
					<span class="font-semibold" style="color: #c08000;">Orange</span> (Faible) – Risque élevé,
					<span class="font-semibold" style="color: #b0b000;">Jaune</span> (Acceptable) – Risque modéré,
					<span class="font-semibold" style="color: #70a030;">Vert clair</span> (Efficace) – Risque faible,
					<span class="font-semibold" style="color: #00b050;">Vert foncé</span> (Exemplaire) – Risque minimal.
				</p>
			</section>
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

			<div class="overflow-x-auto border border-gray-300 rounded-lg">
				<table class="min-w-full bg-white">
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
								Périodicité
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
								<td class="px-2 py-2 border border-gray-300">
									<input
										type="text"
										value={row.refRisque}
										on:input={(e) => updateCell(index, 'refRisque', e)}
										on:blur={() => fillPtrFromCartographie(index)}
										class="w-full px-2 py-1 text-sm border-0 focus:ring-2 focus:ring-blue-500 rounded"
										placeholder="Code risque (ex. DSI-R-SP-001)"
										title="Saisir le code risque puis quitter le champ pour importer les données de la cartographie"
									/>
								</td>
								<td class="px-2 py-2 border border-gray-300">
									<input
										type="text"
										value={row.correspISO}
										on:input={(e) => updateCell(index, 'correspISO', e)}
										class="w-full px-2 py-1 text-sm border-0 focus:ring-2 focus:ring-blue-500 rounded"
										placeholder=""
									/>
								</td>
								<td class="px-2 py-2 border border-gray-300">
									<input
										type="text"
										value={row.proprietaire}
										on:input={(e) => updateCell(index, 'proprietaire', e)}
										class="w-full px-2 py-1 text-sm border-0 focus:ring-2 focus:ring-blue-500 rounded"
										placeholder=""
									/>
								</td>
								<td class="px-2 py-2 border border-gray-300">
									<select
										value={row.niveauRisque}
										on:change={(e) => updateCell(index, 'niveauRisque', e)}
										class="w-full px-2 py-1 text-sm border-0 focus:ring-2 focus:ring-blue-500 rounded"
									>
										<option value="">-</option>
										<option value="Très faible">Très faible</option>
										<option value="Faible">Faible</option>
										<option value="Modéré">Modéré</option>
										<option value="Moyen">Moyen</option>
										<option value="Élevé">Élevé</option>
										<option value="Extrême">Extrême</option>
										<option value="Très élevé">Très élevé</option>
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
								<td class="px-2 py-2 border border-gray-300">
									<input
										type="text"
										value={row.idPTR}
										on:input={(e) => updateCell(index, 'idPTR', e)}
										class="w-full px-2 py-1 text-sm border-0 focus:ring-2 focus:ring-blue-500 rounded"
										placeholder=""
									/>
								</td>
								<td class="px-2 py-2 border border-gray-300">
									<input
										type="text"
										value={row.action}
										on:input={(e) => updateCell(index, 'action', e)}
										class="w-full px-2 py-1 text-sm border-0 focus:ring-2 focus:ring-blue-500 rounded"
										placeholder=""
									/>
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
								<td class="px-2 py-2 border border-gray-300">
									<input
										type="text"
										value={row.porteur}
										on:input={(e) => updateCell(index, 'porteur', e)}
										class="w-full px-2 py-1 text-sm border-0 focus:ring-2 focus:ring-blue-500 rounded"
										placeholder=""
									/>
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
								<td class="px-2 py-2 border border-gray-300">
									<select
										value={row.etatAvancement}
										on:change={(e) => updateCell(index, 'etatAvancement', e)}
										class="w-full px-2 py-1 text-sm border-0 focus:ring-2 focus:ring-blue-500 rounded"
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
		<!-- Échelle PTR : les 4 tables déjà définies -->
		<section class="space-y-6">
			<div class="flex items-center justify-between gap-4 flex-wrap">
				<h2 class="text-xl font-semibold text-gray-900">Échelle-PTR&nbsp;: Tables 1 à 4</h2>
				<button
					type="button"
					class="px-3 py-1.5 text-sm rounded {editModeEchellePtr
						? 'bg-gray-600 text-white hover:bg-gray-700'
						: 'bg-sky-600 text-white hover:bg-sky-700'}"
					on:click={() => (editModeEchellePtr = !editModeEchellePtr)}
				>
					{editModeEchellePtr ? 'Terminer la modification' : 'Modifier'}
				</button>
			</div>

			<section class="space-y-4">
				<h3 class="text-lg font-semibold text-gray-900">Table 1&nbsp;: Périodicité / Durée</h3>
				<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
					<table class="min-w-full text-sm border-collapse border border-black">
						<thead>
							<tr>
								<th class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">Périodicité</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">Durée</th>
								{#if editModeEchellePtr}
									<th class="px-2 py-2 text-center font-semibold text-white bg-yellow-500 border border-black min-w-[120px]">Couleur</th>
									<th class="px-2 py-2 text-center font-semibold text-white bg-yellow-500 border border-black">Actions</th>
								{/if}
							</tr>
						</thead>
						<tbody>
							{#each periodiciteRows as row, i}
								<tr class="border border-black">
									<td class={`px-4 py-2 text-black border border-black ${getPeriodiciteBg(row.periodicite)}`}>
										<input class="w-full border border-transparent bg-transparent" type="text" bind:value={periodiciteRows[i].periodicite} />
									</td>
									<td class="px-4 py-2 text-black border border-black bg-white">
										<input class="w-full border border-gray-300 rounded px-2 py-1 text-sm" type="text" bind:value={periodiciteRows[i].duree} />
									</td>
									{#if editModeEchellePtr}
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
				{#if editModeEchellePtr}
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
								{#if editModeEchellePtr}
									<th class="px-2 py-2 text-center font-semibold text-white bg-yellow-500 border border-black min-w-[120px]">Couleur</th>
									<th class="px-2 py-2 text-center font-semibold text-white bg-yellow-500 border border-black">Actions</th>
								{/if}
							</tr>
						</thead>
						<tbody>
							{#each complexiteRows as row, i}
								<tr class="border border-black">
									<td class={`px-4 py-2 font-medium border border-black ${getComplexiteBg(row.complexite)}`}>
										<input class="w-full border border-transparent bg-transparent font-medium" type="text" bind:value={complexiteRows[i].complexite} />
									</td>
									<td class="px-4 py-2 text-black border border-black bg-white">
										<textarea class="w-full border border-gray-300 rounded px-2 py-1 text-sm min-h-[80px]" bind:value={complexiteRows[i].definition}></textarea>
									</td>
									{#if editModeEchellePtr}
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
				{#if editModeEchellePtr}
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
								{#if editModeEchellePtr}
									<th class="px-2 py-2 text-center font-semibold text-white bg-yellow-500 border border-black min-w-[120px]">Couleur</th>
									<th class="px-2 py-2 text-center font-semibold text-white bg-yellow-500 border border-black">Actions</th>
								{/if}
							</tr>
						</thead>
						<tbody>
							{#each typeActionRows as row, i}
								<tr class="border border-black">
									<td class={`px-4 py-2 font-medium border border-black ${getTypeActionBg(row.type_action)}`}>
										<input class="w-full border border-transparent bg-transparent font-medium" type="text" bind:value={typeActionRows[i].type_action} />
									</td>
									<td class="px-4 py-2 text-black border border-black bg-white">
										<textarea class="w-full border border-gray-300 rounded px-2 py-1 text-sm min-h-[60px]" bind:value={typeActionRows[i].description}></textarea>
									</td>
									{#if editModeEchellePtr}
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
				{#if editModeEchellePtr}
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
								<th colspan={editModeEchellePtr ? 5 : 3} class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black">Priorité de l'action</th>
							</tr>
							<tr>
								<th class="px-4 py-2 text-left font-semibold text-white bg-slate-900 border border-black">Échelle</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-slate-900 border border-black">Définition</th>
								<th class="px-4 py-2 text-left font-semibold text-white bg-slate-900 border border-black">Signification (score)</th>
								{#if editModeEchellePtr}
									<th class="px-2 py-2 text-center font-semibold text-white bg-slate-900 border border-black min-w-[120px]">Couleur</th>
									<th class="px-2 py-2 text-center font-semibold text-white bg-slate-900 border border-black">Actions</th>
								{/if}
							</tr>
						</thead>
						<tbody>
							{#each prioriteRows as row, i}
								<tr class="border border-black">
									<td class="px-4 py-2 font-medium text-black border border-black bg-white">
										<input class="w-full border border-gray-300 rounded px-2 py-1 text-sm" type="text" bind:value={prioriteRows[i].echelle} />
									</td>
									<td class={`px-4 py-2 border border-black ${getPrioriteDefinitionBg(row.echelle)}`}>
										<input class="w-full border border-transparent bg-transparent" type="text" bind:value={prioriteRows[i].definition} />
									</td>
									<td class="px-4 py-2 text-black border border-black bg-white">
										<input class="w-full border border-gray-300 rounded px-2 py-1 text-sm" type="text" bind:value={prioriteRows[i].signification} />
									</td>
									{#if editModeEchellePtr}
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
				{#if editModeEchellePtr}
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