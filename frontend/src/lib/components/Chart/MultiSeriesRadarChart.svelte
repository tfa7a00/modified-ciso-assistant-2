<script lang="ts">
	import { onMount } from 'svelte';

	interface Series {
		name: string;
		data: number[];
	}

	interface Props {
		name: string;
		title?: string;
		categories: string[];
		series: Series[];
		/** Couleurs par série (ordre : première série = index 0). Ex. ['#ef4444', '#f97316', '#22c55e'] */
		colors?: string[];
		width?: string;
		height?: string;
		classesContainer?: string;
	}

	let {
		name,
		title = '',
		categories,
		series,
		colors = [],
		width = 'w-auto',
		height = 'h-full',
		classesContainer = ''
	}: Props = $props();

	const chart_id = `${name}_div`;

	onMount(async () => {
		const echarts = await import('echarts');
		const chart = echarts.init(document.getElementById(chart_id), null, { renderer: 'svg' });

		const allValues = series.flatMap((s) => s.data).filter((v) => Number.isFinite(v));
		const maxVal = allValues.length ? Math.max(...allValues) : 100;
		const axisMax = Math.max(1, Math.ceil(maxVal * 1.1));

		const indicators = categories.map((cat) => ({
			name: cat,
			max: axisMax
		}));

		const seriesColors = ['#ef4444', '#f97316', '#22c55e'];
		const radarSeriesData = series.map((s, i) => {
			const color = colors[i] ?? seriesColors[i] ?? '#999';
			return {
				value: s.data,
				name: s.name,
				symbol: 'circle',
				symbolSize: 6,
				lineStyle: { color, width: 2, type: 'solid' as const },
				areaStyle: { color: color + '30' },
				itemStyle: { color, borderWidth: 1, borderColor: '#fff' },
				label: { show: false }
			};
		});

		const option = {
			title: {
				text: title,
				textStyle: { fontWeight: 'bold', fontSize: 14 }
			},
			tooltip: {
				trigger: 'item',
				formatter: (params: unknown) => {
					const p = params as { name?: string; value?: number[] };
					const name = p?.name ?? '';
					const value = Array.isArray(p?.value) ? p.value : [];
					const lines = [name];
					value.forEach((v, idx) => {
						if (categories[idx] != null) lines.push(`${categories[idx]}: ${v}`);
					});
					return lines.join('<br/>');
				}
			},
			legend: {
				data: series.map((s) => s.name),
				bottom: 0,
				left: 'center'
			},
			radar: {
				shape: 'polygon',
				indicator: indicators,
				radius: '72%',
				center: ['50%', '52%'],
				splitNumber: 4,
				axisName: {
					color: '#333',
					fontSize: 12,
					overflow: 'truncate',
					width: 100
				},
				splitLine: { lineStyle: { color: '#ddd' } },
				splitArea: {
					show: true,
					areaStyle: { color: ['rgba(255,255,255,0)', 'rgba(220,220,220,0.08)'] }
				},
				axisLine: { lineStyle: { color: '#999' } }
			},
			series: [
				{
					name: 'Synthèse risque',
					type: 'radar',
					emphasis: { lineStyle: { width: 3 } },
					data: radarSeriesData
				}
			]
		};

		chart.setOption(option);
		window.addEventListener('resize', () => chart.resize());
	});
</script>

<div id={chart_id} class="{width} {height} {classesContainer}"></div>
