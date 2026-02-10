import { BASE_API_URL } from '$lib/utils/constants';
import type { RequestHandler } from './$types';

// Forward auth info from the frontend to the Django backend.
// Priority:
// 1. Use Authorization header from the incoming request if present
// 2. Fallback to token cookie (Token auth)
// 3. Always forward focus_folder_id if present
function buildBackendHeaders(event: Parameters<RequestHandler>[0]) {
	const headers: Record<string, string> = {
		'Content-Type': 'application/json'
	};

	// 1) Forward existing Authorization header (e.g. "Token xxx" or "Bearer xxx")
	const incomingAuth = event.request.headers.get('authorization');
	if (incomingAuth) {
		headers['Authorization'] = incomingAuth;
	} else {
		// 2) Fallback to token stored in cookies, if any
		const token = event.cookies.get('token');
		if (token) {
			headers['Authorization'] = `Token ${token}`;
		}
	}

	// 3) Forward folder scoping if used by the backend
	const focusFolderId = event.cookies.get('focus_folder_id');
	if (focusFolderId) {
		headers['X-Focus-Folder-Id'] = focusFolderId;
	}

	return headers;
}

export const GET: RequestHandler = async (event) => {
	const endpoint = `${BASE_API_URL}/custom-method-state/`;
	const req = await event.fetch(endpoint, {
		headers: buildBackendHeaders(event)
	});
	const status = req.status;
	const responseData = await req.json();
	return new Response(JSON.stringify(responseData), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
};

export const PATCH: RequestHandler = async (event) => {
	const body = await event.request.text();
	const endpoint = `${BASE_API_URL}/custom-method-state/`;
	const req = await event.fetch(endpoint, {
		method: 'PATCH',
		body,
		headers: buildBackendHeaders(event)
	});
	const status = req.status;
	const responseData = await req.text();
	return new Response(responseData, {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
};
