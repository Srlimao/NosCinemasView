async function fetchSessionRoomInfo(sessionUuid) {
    try {
        const payload = {
            versionInfo: { moduleVersion: "t24CncNHYH1RWGA2bXSdUA", apiVersion: "dfNuAd5RFhuYVM72Ag+GNg" },
            viewName: "MainFlow.Ticket",
            screenData: { variables: { SessionUUID: sessionUuid } }
        };
        const res = await fetch("https://bilheteira.cinemas.nos.pt/Cinemas/screenservices/Cinemas/MainFlow/Ticket/DataActionDT00_GetConfig_and_SessionVars", {
            method: "POST",
            headers: {
                "accept": "application/json",
                "content-type": "application/json",
                "x-csrftoken": "T6C+9iB49TLra4jEsMeSckDMNhQ="
            },
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        const d = json.data || {};
        return {
            roomUUID: d.out_TheaterRoomUUID || "1f665eed-68b3-424e-b5da-d270ea7cf2a3",
            roomName: d.out_RoomName || "Sala",
            movieUUID: d.out_MovieUUID || "",
            theaterUUID: d.out_TheaterUUID || "e0ea3044-4a1b-46b1-bca2-69fd8eae16d7",
            theaterId: d.out_TheaterId || "8",
            startDateTime: d.out_SessionStartDateTime || "2026-07-16T11:30:00.000Z"
        };
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

export async function onRequest(context) {
    if (context.request.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Accept'
            }
        });
    }

    try {
        const url = new URL(context.request.url);
        const sessionUuid = url.searchParams.get('sessionUuid');
        if (!sessionUuid) {
            return new Response(JSON.stringify({ error: "Missing sessionUuid" }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
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
            return new Response(JSON.stringify({ error: "Failed to fetch seats from NOS API" }), {
                status: nosRes.status,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        const json = await nosRes.json();
        const seatsList = json.data?.QueuesAndSeats_LR?.List || [];

        return new Response(JSON.stringify(seatsList), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-store'
            }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
}
