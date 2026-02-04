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
		<section class="space-y-4">
			<h2 class="text-xl font-semibold text-gray-900">Aide-Classification</h2>
			<p class="text-gray-700">
				Contenu de l’aide à la classification à insérer ici. Tu peux me transmettre les éléments
				restants pour que je complète cette partie.
			</p>
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
		<section class="space-y-4">
			<h2 class="text-xl font-semibold text-gray-900">Aide-Risque</h2>
			<p class="text-gray-700">
				Contenu d’aide à l’évaluation des risques à insérer ici. Envoie-moi le détail pour que je
				le mette en forme.
			</p>
		</section>
	{:else if activeSection === 'ptr'}
		<section class="space-y-4">
			<h2 class="text-xl font-semibold text-gray-900">PTR</h2>
			<p class="text-gray-700">
				Section dédiée au PTR (Plan de Traitement des Risques ou autre signification selon ta
				méthode). Cette partie sera complétée avec le contenu que tu vas m’envoyer.
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
				<h3 class="text-lg font-semibold text-gray-900">Table 3&nbsp;: Type de l’action</h3>
				<div class="overflow-hidden rounded-lg border border-black bg-white shadow-sm">
					<table class="min-w-full text-sm align-top border-collapse border border-black">
						<thead>
							<tr>
								<th
									class="px-4 py-2 text-left font-semibold text-white bg-yellow-500 border border-black"
								>
									Type de l’action
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
				<h3 class="text-lg font-semibold text-gray-900">Table 4&nbsp;: Priorité de l’action</h3>
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

