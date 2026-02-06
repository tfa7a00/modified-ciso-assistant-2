<script lang="ts">
	// Page simple pour afficher une "méthode personnalisée"
	// avec des tableaux statiques basés sur tes définitions en français.

	type Row = Record<string, string>;

	// Gestion des 6 sous-parties de la méthode personnalisée
	type SectionId =
		| 'registre-classification'
		| 'aide-classification'
		| 'cartographie-risques'
		| 'aide-risque'
		| 'ptr'
		| 'echelle-ptr';

	let activeSection: SectionId = 'registre-classification';

	const periodiciteRows: Row[] = [
		{ periodicite: 'QuickWin', duree: '0 – 3 mois' },
		{ periodicite: 'Court terme', duree: '3 – 12 mois' },
		{ periodicite: 'Moyen terme', duree: '12 – 18 mois' },
		{ periodicite: 'Long terme', duree: 'Supérieur à 18 mois' },
		{ periodicite: 'Périodique', duree: 'Périodiquement' }
	];

	const complexiteRows: Row[] = [
		{
			complexite: 'Important',
			definition:
				"Complexité à coût important, correspondant à une tâche supérieure à une dizaine de jours/homme et/ou un coût supérieur à une centaine de milliers de dirhams (par exemple, refonte d'une architecture réseau)."
		},
		{
			complexite: 'Moyen',
			definition:
				"Complexité à coût moyen, correspondant à une tâche inférieure à une dizaine de jours/homme et/ou un coût inférieur à une centaine de milliers de dirhams (par exemple, rédaction d'une procédure plus complexe, achat d'un composant, etc.)."
		},
		{
			complexite: 'Faible',
			definition:
				"Complexité à coût faible, n'entraînant pas de coût d'acquisition (par exemple, modification d'un paramètre, rédaction d'une procédure simple, etc.)."
		}
	];

	const typeActionRows: Row[] = [
		{
			type_action: 'Action Organisationnelle',
			description: 'Action visant à modifier les processus ou politiques internes de la SOCIÉTÉ.'
		},
		{
			type_action: 'Action Technique',
			description: 'Intervention sur les SI ou infrastructures techniques de la SOCIÉTÉ.'
		},
		{
			type_action: 'Action Organisationnelle et Technique',
			description: 'Action combinant les deux dimensions (organisationnelle et technique).'
		}
	];

	const prioriteRows: Row[] = [
		{
			echelle: 'Priorité 4',
			definition: 'Risque Faible',
			signification: '[1 – 20['
		},
		{
			echelle: 'Priorité 3',
			definition: 'Risque Modéré',
			signification: '[20 – 36['
		},
		{
			echelle: 'Priorité 2',
			definition: 'Risque Élevé',
			signification: '[36 – 64['
		},
		{
			echelle: 'Priorité 1',
			definition: 'Risque Extrême',
			signification: '[64 – 120]'
		}
	];

	// --- Aide-Classification: Tableaux DIC ---

	type DICCriteriaRow = {
		critere: string;
		definition: string;
		bgColor: string;
	};

	const dicCriteriaRows: DICCriteriaRow[] = [
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
	};

	const dicNiveauxRows: DICNiveauRow[] = [
		{
			valeur: 'Faible',
			disponibilite:
				"Tolérance à l'indisponibilité **entre 48h et une semaine**. Si ce besoin n'est pas respecté, l'organisation court un **impact mineur** sur les activités.",
			integrite:
				"**La perte d'intégrité momentanée** des informations est acceptée, sous réserve qu'elle soit signalée et ne remette pas en cause le service fourni.",
			confidentialite:
				"**Public** : Information qui peut être rendue publique sans implication pour l'entité ou pour l'organisation."
		},
		{
			valeur: 'Moyen',
			disponibilite:
				"Tolérance à l'indisponibilité **entre 24h et 48h**. Si ce besoin n'est pas respecté, l'organisation court un **impact modéré**.",
			integrite:
				"**La perte d'intégrité tolérée si signalée** dans un délai suffisant pour ne pas avoir de conséquence grave sur le service fourni.",
			confidentialite:
				"**Interne** : Information ayant vocation à demeurer au sein de l'organisation. Sa communication à l'extérieur de l'organisation ne peut se faire que sur autorisation."
		},
		{
			valeur: 'Élevé',
			disponibilite:
				"Tolérance à l'indisponibilité **entre 4h et 24h**. Si ce besoin n'est pas respecté, l'organisation court un **impact significatif**.",
			integrite:
				"Les informations **doivent rester intègres pendant la période d'utilisation** ; toute perte en dehors de cette période doit être signalée et justifiée.",
			confidentialite:
				"**Restreint** : Information qui aurait un impact dommageable sur l'organisation si elle était communiquée à des personnes non habilitées. Elle nécessite un accès limité à des personnes ou à un groupe d'utilisateurs bien défini."
		},
		{
			valeur: 'Très élevé',
			disponibilite:
				"Tolérance à l'indisponibilité **inférieure à 4 heures**. Si ce besoin n'est pas respecté, l'organisation court un **impact exceptionnellement majeur**.",
			integrite:
				'Les informations sont **certifiées intègres** pendant toute leur période de validité.',
			confidentialite:
				"**Confidentiel** : La divulgation de l'information aurait un impact majeur sur la SOCIETE si elle était communiquée à des personnes nommément désignées pour en connaître. Le circuit de l'information obéit à des règles très strictes."
		}
	];

	const categoriesActifsRows: string[] = [
		'Matériel informatique',
		'Application',
		'Equipements sécurité',
		'Equipements réseaux',
		'Ressources humaines',
		'Document',
		'Données',
		'Site'
	];

	function getPeriodiciteBg(periodicite: string): string {
		switch (periodicite) {
			case 'QuickWin':
				return 'bg-orange-100';
			case 'Court terme':
				return 'bg-green-100';
			case 'Moyen terme':
				return 'bg-yellow-100';
			case 'Long terme':
				return 'bg-gray-100';
			case 'Périodique':
				return 'bg-sky-100';
			default:
				return 'bg-white';
		}
	}

	function getComplexiteBg(complexite: string): string {
		switch (complexite) {
			case 'Important':
				return 'bg-red-500 text-black';
			case 'Moyen':
				return 'bg-yellow-400 text-black';
			case 'Faible':
				return 'bg-green-400 text-black';
			default:
				return 'bg-white text-black';
		}
	}

	function getTypeActionBg(typeAction: string): string {
		switch (typeAction) {
			case 'Action Organisationnelle':
				return 'bg-sky-100';
			case 'Action Technique':
				return 'bg-green-100';
			case 'Action Organisationnelle et Technique':
				return 'bg-amber-100';
			default:
				return 'bg-white';
		}
	}

	function getPrioriteDefinitionBg(echelle: string): string {
		switch (echelle) {
			case 'Priorité 4':
				return 'bg-green-400 text-black';
			case 'Priorité 3':
				return 'bg-yellow-300 text-black';
			case 'Priorité 2':
				return 'bg-orange-400 text-black';
			case 'Priorité 1':
				return 'bg-red-500 text-black';
			default:
				return 'bg-white text-black';
		}
	}

	function getValeurBg(valeur: string): string {
		switch (valeur) {
			case 'Faible':
				return 'bg-orange-400';
			case 'Moyen':
				return 'bg-orange-500';
			case 'Élevé':
				return 'bg-orange-600';
			case 'Très élevé':
				return 'bg-orange-700';
			default:
				return 'bg-orange-500';
		}
	}

	// --- Aide-Risque : tableaux probabilité / impact / fréquence / matrice ---

	type ProbaRow = {
		echelle: string;
		definition: string;
		frequence: string;
		historique: string;
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

	function getMatriceCellBg(valeur: number): string {
		if (valeur < 20) {
			return 'bg-green-400 text-black'; // zone verte [1–20[
		}
		if (valeur >= 20 && valeur < 36) {
			return 'bg-yellow-300 text-black'; // zone jaune [20–36[
		}
		if (valeur >= 36 && valeur < 64) {
			return 'bg-orange-400 text-black'; // zone orange [36–64[
		}
		return 'bg-red-500 text-black'; // zone rouge [64–120]
	}
</script>

<main class="p-6 space-y-8">
	<section class="space-y-2">
		<h1 class="text-2xl font-bold text-gray-900">Méthode personnalisée</h1>
		<p class="text-gray-600 max-w-3xl">
			Cette page regroupe les éléments de ta méthode personnalisée (registre de classification,
			aides, cartographie des risques, PTR et échelle PTR). Les sections ci-dessous ne modifient
			pas le moteur de scoring standard de CISO Assistant, mais servent de guide pour la méthode de
			NearSecure.
		</p>
	</section>

	<!-- Navigation entre les 6 sous-parties -->
	<nav class="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
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

	<!-- Contenu : 6 sous-parties -->

	{#if activeSection === 'registre-classification'}
		<section class="space-y-4">
			<h2 class="text-xl font-semibold text-gray-900">Registre de classification</h2>
			<p class="text-gray-700">
				Contenu du registre de classification à insérer ici. Envoie-moi le texte / tableaux et je
				les intégrerai dans cette section.
			</p>
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
								{#each dicCriteriaRows as criteria}
									<th
										class={`px-4 py-2 text-left font-semibold text-white border border-black ${criteria.bgColor}`}
									>
										{criteria.critere}
									</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							<tr class="border border-black">
								{#each dicCriteriaRows as criteria}
									<td class="px-4 py-2 text-black border border-black bg-white align-top">
										{criteria.definition}
									</td>
								{/each}
							</tr>
						</tbody>
					</table>
				</div>
			</section>

			<!-- Tableau 1.2 – Niveaux de valeur par critère (D / I / C) -->
			<section class="space-y-3">
				<h3 class="text-lg font-semibold text-gray-900">
					Tableau 1.2 – Niveaux de valeur par critère (D / I / C)
				</h3>
				<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
					<table class="min-w-full text-sm border-collapse border border-black">
						<thead>
							<tr>
								<th
									class="px-4 py-2 text-left font-semibold text-white bg-orange-500 border border-black"
								>
									Valeur
								</th>
								<th
									class="px-4 py-2 text-left font-semibold text-white bg-green-600 border border-black"
								>
									Disponibilité (D)
								</th>
								<th
									class="px-4 py-2 text-left font-semibold text-white bg-green-400 border border-black"
								>
									Intégrité (I)
								</th>
								<th
									class="px-4 py-2 text-left font-semibold text-white bg-blue-600 border border-black"
								>
									Confidentialité (C)
								</th>
							</tr>
						</thead>
						<tbody>
							{#each dicNiveauxRows as row}
								<tr class="border border-black">
									<td
										class={`px-4 py-2 font-semibold text-white border border-black ${getValeurBg(row.valeur)}`}
									>
										{row.valeur}
									</td>
									<td class="px-4 py-2 text-black border border-black bg-white align-top text-xs">
										{@html row.disponibilite.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}
									</td>
									<td class="px-4 py-2 text-black border border-black bg-white align-top text-xs">
										{@html row.integrite.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}
									</td>
									<td class="px-4 py-2 text-black border border-black bg-white align-top text-xs">
										{@html row.confidentialite.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>

			<!-- Tableau 2 – Catégories d'actifs -->
			<section class="space-y-3">
				<h3 class="text-lg font-semibold text-gray-900">Tableau 2 – Catégories d'actifs</h3>
				<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
					<table class="min-w-full text-sm border-collapse border border-black">
						<thead>
							<tr>
								<th
									class="px-4 py-3 text-center font-semibold text-black bg-sky-200 border border-black"
								>
									Catégories d'actifs
								</th>
							</tr>
						</thead>
						<tbody>
							{#each categoriesActifsRows as categorie}
								<tr class="border border-black">
									<td class="px-4 py-2 text-black border border-black bg-white text-center">
										{categorie}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
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
		</section>
	{:else if activeSection === 'cartographie-risques'}
		<section class="space-y-4">
			<h2 class="text-xl font-semibold text-gray-900">Cartographie des risques</h2>
			<p class="text-gray-700">
				Contenu de la cartographie des risques à insérer ici (tableaux, matrices, définitions,
				etc.).
			</p>
		</section>
	{:else if activeSection === 'aide-risque'}
		<section class="space-y-8">
			<h2 class="text-xl font-semibold text-gray-900">Aide-Risque</h2>

			<!-- Tableau 1 – Échelle de probabilité / fréquence -->
			<section class="space-y-3">
				<h3 class="text-lg font-semibold text-gray-900">
					Tableau 1&nbsp;: Échelle de probabilité / fréquence
				</h3>
				<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
					<table class="min-w-full text-sm border-collapse border border-black">
						<thead>
							<tr>
								<th
									class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black"
								>
									Échelle
								</th>
								<th
									class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black"
								>
									Définition
								</th>
								<th
									class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black"
								>
									Fréquence
								</th>
								<th
									class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black"
								>
									Désignation de la probabilité
								</th>
							</tr>
						</thead>
						<tbody>
							{#each probaRows as row}
								<tr class="border border-black">
									<td class="px-4 py-2 text-black border border-black bg-white">
										{row.echelle}
									</td>
									<td
										class={`px-4 py-2 border border-black ${getProbaDefBg(row.definition)}`}
									>
										<span class="font-semibold">{row.definition}</span>
									</td>
									<td class="px-4 py-2 text-black border border-black bg-white align-top">
										<p class="text-xs">
											<span class="font-semibold">Fréquence :</span>
										</p>
										<p class="mt-1 text-xs">{row.frequence}</p>
									</td>
									<td class="px-4 py-2 text-black border border-black bg-white align-top">
										<p class="text-xs">
											<span class="font-semibold">Historique :</span>
										</p>
										<p class="mt-1 text-xs">{row.historique}</p>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>

			<!-- Tableau 2 – Échelle d'impact -->
			<section class="space-y-3">
				<h3 class="text-lg font-semibold text-gray-900">Tableau 2&nbsp;: Échelle d'impact</h3>
				<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
					<table class="min-w-full text-sm border-collapse border border-black">
						<thead>
							<tr>
								<th
									class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black"
								>
									Échelle
								</th>
								<th
									class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black"
								>
									Définition
								</th>
								<th
									class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black"
								>
									Financier
								</th>
								<th
									class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black"
								>
									Réputation
								</th>
								<th
									class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black"
								>
									Parties prenantes
								</th>
								<th
									class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black"
								>
									Réglementaire
								</th>
							</tr>
						</thead>
						<tbody>
							{#each impactRows as row}
								<tr class="border border-black">
									<td class="px-4 py-2 text-black border border-black bg-white">
										{row.echelle}
									</td>
									<td
										class={`px-4 py-2 border border-black ${getImpactDefBg(row.definition)}`}
									>
										<span class="font-semibold">{row.definition}</span>
									</td>
									<td class="px-4 py-2 text-black border border-black bg-white align-top">
										<p class="text-xs">
											<span class="font-semibold">Financier :</span>
										</p>
										<p class="mt-1 text-xs">{row.financier}</p>
									</td>
									<td class="px-4 py-2 text-black border border-black bg-white align-top">
										<p class="text-xs">
											<span class="font-semibold">Réputation :</span>
										</p>
										<p class="mt-1 text-xs">{row.reputation}</p>
									</td>
									<td class="px-4 py-2 text-black border border-black bg-white align-top">
										<p class="text-xs">
											<span class="font-semibold">Parties prenantes :</span>
										</p>
										<p class="mt-1 text-xs">{row.parties_prenantes}</p>
									</td>
									<td class="px-4 py-2 text-black border border-black bg-white align-top">
										<p class="text-xs">
											<span class="font-semibold">Réglementaire :</span>
										</p>
										<p class="mt-1 text-xs">{row.reglementaire}</p>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				<p class="text-xs text-gray-600">
					Les mots‑clés <strong>Financier</strong>, <strong>Réputation</strong>,
					<strong>Parties prenantes</strong> et <strong>Réglementaire</strong> doivent être
					considérés comme des axes d'analyse principaux.
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
								<th
									colspan="3"
									class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black"
								>
									Fréquence / Probabilité d'occurrence
								</th>
							</tr>
							<tr>
								<th
									class="px-4 py-2 text-left font-semibold text-white bg-slate-900 border border-black"
								>
									Échelle
								</th>
								<th
									class="px-4 py-2 text-left font-semibold text-white bg-slate-900 border border-black"
								>
									Définition
								</th>
								<th
									class="px-4 py-2 text-left font-semibold text-white bg-slate-900 border border-black"
								>
									Signification
								</th>
							</tr>
						</thead>
						<tbody>
							{#each frequenceRisqueRows as row, i}
								<tr class="border border-black">
									<td class="px-4 py-2 text-black border border-black bg-white">
										<input
											class="w-16 border border-gray-300 rounded px-1 py-0.5 text-sm"
											type="text"
											bind:value={frequenceRisqueRows[i].echelle}
										/>
									</td>
									<td
										class={`px-4 py-2 border border-black ${getFrequenceDefBg(row.definition)}`}
									>
										<input
											class="w-full border border-transparent bg-transparent font-semibold"
											type="text"
											bind:value={frequenceRisqueRows[i].definition}
										/>
									</td>
									<td class="px-4 py-2 text-black border border-black bg-white">
										<input
											class="w-full border border-gray-300 rounded px-1 py-0.5 text-sm"
											type="text"
											bind:value={frequenceRisqueRows[i].signification}
										/>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>

			<!-- Tableau 3.2 – Matrice de vraisemblance du risque -->
			<section class="space-y-3">
				<h3 class="text-lg font-semibold text-gray-900">
					Tableau 3.2&nbsp;: Matrice de vraisemblance du risque
				</h3>
				<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
					<table class="min-w-full text-sm border-collapse border border-black">
						<thead>
							<tr>
								<th
									class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black"
								>
									Impact du risque × Criticité de l'actif \ Vraisemblance du risque
								</th>
								{#each [1, 2, 3, 4, 5] as col}
									<th class="px-4 py-2 text-sm font-semibold border border-black bg-gray-100">
										{col}
									</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each matriceRisqueRows as row, i}
								<tr class="border border-black">
									<td class="px-2 py-2 text-sm border border-black bg-white">
										<input
											class="w-20 border border-gray-300 rounded px-1 py-0.5 text-sm"
											type="text"
											bind:value={matriceRisqueRows[i].libelle}
										/>
									</td>
									{#each row.valeurs as v, j}
										<td
											class={`px-2 py-2 text-xs text-center border border-black ${getMatriceCellBg(v)}`}
										>
											<input
												class="w-16 text-center border border-gray-300 rounded px-1 py-0.5 text-xs bg-transparent"
												type="number"
												bind:value={matriceRisqueRows[i].valeurs[j]}
											/>
										</td>
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				<p class="text-xs text-gray-600">
					Les zones vertes correspondent à la plage [1–20[ (Risque Faible), les zones jaunes à
					[20–36[, les zones orange à [36–64[ et les zones rouges à [64–120] (Risque Extrême).
				</p>
			</section>
		</section>
	{:else if activeSection === 'ptr'}
		<section class="space-y-4">
			<h2 class="text-xl font-semibold text-gray-900">PTR</h2>
			<p class="text-gray-700">
				Section dédiée au PTR (Plan de Traitement des Risques ou autre signification selon ta
				méthode). Cette partie sera complétée avec le contenu que tu vas m'envoyer.
			</p>
		</section>
	{:else if activeSection === 'echelle-ptr'}
		<!-- Échelle PTR : les 4 tables déjà définies -->
		<section class="space-y-6">
			<h2 class="text-xl font-semibold text-gray-900">Échelle-PTR&nbsp;: Tables 1 à 4</h2>

			<section class="space-y-4">
				<h3 class="text-lg font-semibold text-gray-900">Table 1&nbsp;: Périodicité / Durée</h3>
				<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
					<table class="min-w-full text-sm border-collapse border border-black">
						<thead>
							<tr>
								<th
									class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black"
								>
									Périodicité
								</th>
								<th
									class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black"
								>
									Durée
								</th>
							</tr>
						</thead>
						<tbody>
							{#each periodiciteRows as row}
								<tr class="border border-black">
									<td
										class={`px-4 py-2 text-black border border-black ${getPeriodiciteBg(row.periodicite)}`}
									>
										{row.periodicite}
									</td>
									<td class="px-4 py-2 text-black border border-black bg-white">
										{row.duree}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>

			<section class="space-y-4">
				<h3 class="text-lg font-semibold text-gray-900">Table 2&nbsp;: Niveau de complexité</h3>
				<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
					<table class="min-w-full text-sm align-top border-collapse border border-black">
						<thead>
							<tr>
								<th
									class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black"
								>
									Complexité
								</th>
								<th
									class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black"
								>
									Définition du niveau de complexité supposé
								</th>
							</tr>
						</thead>
						<tbody>
							{#each complexiteRows as row}
								<tr class="border border-black">
									<td
										class={`px-4 py-2 font-medium border border-black ${getComplexiteBg(row.complexite)}`}
									>
										{row.complexite}
									</td>
									<td class="px-4 py-2 text-black border border-black bg-white">
										{row.definition}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>

			<section class="space-y-4">
				<h3 class="text-lg font-semibold text-gray-900">Table 3&nbsp;: Type de l'action</h3>
				<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
					<table class="min-w-full text-sm align-top border-collapse border border-black">
						<thead>
							<tr>
								<th
									class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black"
								>
									Type de l'action
								</th>
								<th
									class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black"
								>
									Description
								</th>
							</tr>
						</thead>
						<tbody>
							{#each typeActionRows as row}
								<tr class="border border-black">
									<td
										class={`px-4 py-2 font-medium border border-black ${getTypeActionBg(row.type_action)}`}
									>
										{row.type_action}
									</td>
									<td class="px-4 py-2 text-black border border-black bg-white">
										{row.description}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>

			<section class="space-y-4">
				<h3 class="text-lg font-semibold text-gray-900">Table 4&nbsp;: Priorité de l'action</h3>
				<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
					<table class="min-w-full text-sm border-collapse border border-black">
						<thead>
							<tr>
								<th
									colspan="3"
									class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black"
								>
									Priorité de l'action
								</th>
							</tr>
							<tr>
								<th
									class="px-4 py-2 text-left font-semibold text-white bg-slate-900 border border-black"
								>
									Échelle
								</th>
								<th
									class="px-4 py-2 text-left font-semibold text-white bg-slate-900 border border-black"
								>
									Définition
								</th>
								<th
									class="px-4 py-2 text-left font-semibold text-white bg-slate-900 border border-black"
								>
									Signification (score)
								</th>
							</tr>
						</thead>
						<tbody>
							{#each prioriteRows as row}
								<tr class="border border-black">
									<td class="px-4 py-2 font-medium text-black border border-black bg-white">
										{row.echelle}
									</td>
									<td
										class={`px-4 py-2 border border-black ${getPrioriteDefinitionBg(row.echelle)}`}
									>
										{row.definition}
									</td>
									<td class="px-4 py-2 text-black border border-black bg-white">
										{row.signification}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>
		</section>
	{/if}
</main>