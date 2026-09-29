import { onRequest as handleMovies } from './functions/movies.js';
import { onRequest as handleSessions } from './functions/sessions.js';
import { onRequest as handleSeats } from './functions/seats.js';

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        if (url.pathname === '/movies') {
            return handleMovies({ request, env, ctx });
        }
        if (url.pathname === '/sessions') {
            return handleSessions({ request, env, ctx });
        }
        if (url.pathname === '/seats') {
            return handleSeats({ request, env, ctx });
        }

        // Delegate static asset serving
        if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
            return env.ASSETS.fetch(request);
        }

        return new Response('Not Found', { status: 404 });
    }
};
