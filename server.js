const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const sessionMetaCache = new Map();

const MIME_TYPES = {
    '.html': 'text/html; charset=UTF-8',
    '.js': 'application/javascript; charset=UTF-8',
    '.css': 'text/css; charset=UTF-8',
    '.json': 'application/json; charset=UTF-8',
    '.svg': 'image/svg+xml'
};

const setCorsHeaders = (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
};

const serveStatic = (filePath, res) => {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    fs.readFile(filePath, (err, content) => {
        if (err) {
            setCorsHeaders(res);
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('File not found');
            return;
        }
        setCorsHeaders(res);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
    });
};

async function fetchSessionRoomInfo(sessionUuid) {
    if (sessionMetaCache.has(sessionUuid)) return sessionMetaCache.get(sessionUuid);
    try {
        const payload = {
            versionInfo: { moduleVersion: "t24CncNHYH1RWGA2bXSdUA", apiVersion: "dfNuAd5RFhuYVM72Ag+GNg" },
            viewName: "MainFlow.Ticket",
            screenData: { variables: { SessionUUID: sessionUuid } }
        };
        const res = await fetch("https://bilheteira.cinemas.nos.pt/Cinemas/screenservices/Cinemas/MainFlow/Ticket/DataActionDT00_GetConfig_and_SessionVars", {
            method: "POST",
            headers: { "accept": "application/json", "content-type": "application/json", "x-csrftoken": "T6C+9iB49TLra4jEsMeSckDMNhQ=" },
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        const d = json.data || {};
        const meta = {
            roomUUID: d.out_TheaterRoomUUID || "1f665eed-68b3-424e-b5da-d270ea7cf2a3",
            roomName: d.out_RoomName || "Sala",
            movieUUID: d.out_MovieUUID || "",
            theaterUUID: d.out_TheaterUUID || "e0ea3044-4a1b-46b1-bca2-69fd8eae16d7",
            theaterId: d.out_TheaterId || "8",
            startDateTime: d.out_SessionStartDateTime || "2026-07-16T11:30:00.000Z"
        };
        sessionMetaCache.set(sessionUuid, meta);
        return meta;
    } catch {
        return {
            roomUUID: "1f665eed-68b3-424e-b5da-d270ea7cf2a3",
            roomName: "Sala",
            movieUUID: "",
            theaterUUID: "e0ea3044-4a1b-46b1-bca2-69fd8eae16d7",
            theaterId: "8",
            startDateTime: "2026-07-16T11:30:00.000Z"
        };
    }
}

const server = http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') {
        setCorsHeaders(res);
        res.writeHead(204);
        res.end();
        return;
    }

    try {
        const url = new URL(req.url, `http://${req.headers.host}`);

        // Static files
        if (url.pathname === '/' || url.pathname === '/index.html') {
            return serveStatic(path.join(__dirname, 'index.html'), res);
        }
        if (['/app.js', '/seatmap.js', '/preferred.js', '/dynamic_movies.html', '/available_seats.html'].includes(url.pathname)) {
            return serveStatic(path.join(__dirname, url.pathname.slice(1)), res);
        }

        // API: Movies list
        if (url.pathname === '/movies') {
            const nosRes = await fetch("https://www.cinemas.nos.pt/graphql/execute.json/cinemas/getAllMovies", {
                headers: { "accept": "application/json" }
            });
            const data = await nosRes.json();
            setCorsHeaders(res);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
            return;
        }

        // API: Sessions for a movie
        if (url.pathname === '/sessions') {
            const id = url.searchParams.get('id');
            if (!id) {
                setCorsHeaders(res);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: "Missing movie id" }));
                return;
            }
            const nosRes = await fetch(`https://www.cinemas.nos.pt/bin/cinemas/render/getMovieSessions.getMovieSessionsAggregator.json?aggregateMovieId=${id}`, {
                headers: { "accept": "application/json" }
            });
            const data = await nosRes.json();
            setCorsHeaders(res);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
            return;
        }

        // API: Seat matrix for a session with dynamic room lookup
        if (url.pathname === '/seats') {
            const sessionUuid = url.searchParams.get('sessionUuid');
            if (!sessionUuid) {
                setCorsHeaders(res);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: "Missing sessionUuid" }));
                return;
            }

            const meta = await fetchSessionRoomInfo(sessionUuid);

            const payload = {
                "versionInfo": { "moduleVersion": "wbD2tMAgSd_pb8VIvWGxPQ", "apiVersion": "jDwh+jx3g7GikaonAE6Qgg" },
                "viewName": "MainFlow.Ticket",
                "screenData": {
                    "variables": {
                        "IsMainContentVisible": true, "IsZoom": false, "ZoomValue": "1", "SeatDimension": "0",
                        "IsInfoSeats": false, "SelectedSeats_String": "", "Is_IOS": false,
                        "NumberOfSelectedSeats": 0, "IsDataFetched": false,
                        "SessionUUID": sessionUuid,
                        "_sessionUUIDInDataFetchStatus": 1,
                        "TheaterRoomUUID": meta.roomUUID,
                        "_theaterRoomUUIDInDataFetchStatus": 1,
                        "IsToFetchSuggestsRoomSeats": true,
                        "_isToFetchSuggestsRoomSeatsInDataFetchStatus": 1,
                        "SelectedTicketsCount": 1,
                        "_selectedTicketsCountInDataFetchStatus": 1,
                        "Local_Purchase": {
                            "MovieUUID": meta.movieUUID, "AggregatorUUID": "",
                            "TheaterUUID": meta.theaterUUID,
                            "TicketUUID": "", "TheaterId": meta.theaterId,
                            "TheaterRoomUUID": meta.roomUUID,
                            "StartDateTime": meta.startDateTime,
                            "SelectedTicketsCount": 1, "CartTotal": "0", "SeatCount": 1,
                            "SessionUUID": sessionUuid,
                            "Step": 2, "IncludeTaxDetails": false,
                            "InvoiceName": "", "InvoiceTaxNumber": "", "InvoiceAddress": "", "InvoiceCity": "", "InvoiceZipCode": "",
                            "BookingId": "1b958b04-dc6f-401e-9930-c35f7e8240bd", "ShoppingCartSuccess": false, "HasChangedSeats": false
                        },
                        "_local_PurchaseInDataFetchStatus": 1,
                        "Local_PurchaseControlVariables": {
                            "Retries_NosBenefits": 0, "Retries_Other": 0, "IsToClearBenefits": false, "ShowNoSessionPopUp": false,
                            "ShowBarBenefitAddProduct": false, "NeedSelectBenefit": false, "IsValidateError": false,
                            "IsToShowSecuritySeatOverlay": false, "IsToFetchSuggestsRoomSeats": true, "IsToEnableNextStep": false,
                            "IsToShowProductDetail": false, "ShowCloseBarPopUp": false, "IsfromTicketResume": false,
                            "IsToDisableTicketResume_Click": false, "IsToShowBarUnavailable": false, "ShowConfirmExitPopUp": false,
                            "IsCAPTCHAEnabled": false, "HasAddedAnyProductToCart": false, "IsIsolatedBarPurchase": false
                        },
                        "_local_PurchaseControlVariablesInDataFetchStatus": 1
                    }
                },
                "clientVariables": {
                    "IsErrorFromProfile": false, "NosId": "", "NameUser": "",
                    "DeviceType": "desktop", "WasLoggedByUs": false, "RefreshToken": "", "HasSeenVIPPopUp": false
                }
            };

            const nosRes = await fetch("https://bilheteira.cinemas.nos.pt/Cinemas/screenservices/Cinemas_Bilheteiras_BLOCKS/Blocks/TicketStep2_SelectSeats/DataActionFetch_SeatsGet_ForRoomWithRows", {
                method: "POST",
                headers: {
                    "accept": "application/json",
                    "content-type": "application/json; charset=UTF-8",
                    "x-csrftoken": "T6C+9iB49TLra4jEsMeSckDMNhQ="
                },
                body: JSON.stringify(payload)
            });

            if (!nosRes.ok) {
                setCorsHeaders(res);
                res.writeHead(nosRes.status, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: "Failed to fetch seats from NOS API" }));
                return;
            }

            const json = await nosRes.json();
            const seatsList = json.data?.QueuesAndSeats_LR?.List || [];

            setCorsHeaders(res);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(seatsList));
            return;
        }

        setCorsHeaders(res);
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end("Not Found");

    } catch (error) {
        console.error(error);
        setCorsHeaders(res);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
    }
});

server.listen(PORT, () => {
    console.log(`🎬 Cinemas Dynamic Explorer running at http://localhost:${PORT}`);
});
