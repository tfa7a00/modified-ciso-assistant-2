import { BASE_API_URL } from '$lib/utils/constants';
import type { RequestHandler } from './$types';

// NOTE:
// We let SvelteKit's `handleFetch` (in `hooks.server.ts`) take care of:
// - Attaching `Authorization: Token <token>` from the `token` cookie
// - Forwarding CSRF + focus folder headers when needed
// This keeps behavior consistent with other `/fe-api` endpoints like `user-preferences`.

export const GET: RequestHandler = async ({ fetch }) => {
	const endpoint = `${BASE_API_URL}/custom-method-state/`;
	const req = await fetch(endpoint);
	const status = req.status;
	const responseData = await req.json();
	return new Response(JSON.stringify(responseData), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
};

export const PATCH: RequestHandler = async ({ fetch, request }) => {
	const body = await request.text();
	const endpoint = `${BASE_API_URL}/custom-method-state/`;
	const req = await fetch(endpoint, {
		method: 'PATCH',
		body
	});
	const status = req.status;
	const responseData = await req.text();
	return new Response(responseData, {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
};
