# EcoLink API and Database Flow Audit

This document separates the temporary frontend testing API from the real backend API.

## Current API Switch

- Mock mode: `npm run dev:mock` loads `.env.mock`.
- Mock flag: `VITE_USE_MOCK_API=true`.
- Mock base URL: `VITE_MOCK_API_URL=http://localhost:3100/api`.
- Real mode: `npm run dev` uses `VITE_API_BASE_URL`.
- Current real API base URL: `https://documenter.getpostman.com/view/45880468/2sBXqFLMYB`.
- The published Postman collection currently documents request examples against `http://localhost:3000/api`; update `VITE_API_BASE_URL` if the backend team provides a deployed runtime host.

The switch is implemented in `src/utils/apiConfig.js` and consumed by `src/utils/apiClient.js`.

## Temporary Mock Storage

- Mock server: `mock-api/server.js`.
- Mock database file: `mock-api/db.json`.
- Mock data persists in that JSON file until it is edited/reset.
- Frontend fallback notifications can also be stored in browser localStorage under:
  - `EcoLinkLocalNotifications`
  - auth/session keys: `User`, `UserToken`, `RefreshToken`

## Real Backend Storage

- Backend folder: `backend`.
- Database type: MongoDB via Mongoose.
- Connection file: `backend/src/DB/connection.js`.
- Environment variable: `MONGODB_URI`.
- Local fallback URL in code: `mongodb://localhost:27017/Ecolink`.
- Current backend `.env` file also defines `MONGODB_URI`.

Important collections/models:

- Users: `User` model in `backend/src/DB/models/user.model.js`.
- Listings/waste: `Waste` model in `backend/src/DB/models/waste.model.js`.
- Notifications: `Notification` model in `backend/src/DB/models/notification.model.js`.
- Orders: `Order` model in `backend/src/DB/models/order.model.js`.
- Payments: `Payment` model in `backend/src/modules/payment/payment.model.js`.

## Feature Endpoint Map

| Feature | Frontend endpoint | Mock support | Real backend route currently present |
| --- | --- | --- | --- |
| Register | `POST /auth/register` | Yes | Yes |
| Login | `POST /auth/login` | Yes | Yes |
| Profile after login | `GET /user/profile` | Yes | Yes |
| Create listing | `POST /listings` | Yes | Yes |
| Edit listing | `PATCH /listings/:id` | Yes | Yes |
| Get listings | `GET /listings` | Yes | Yes |
| Get listing by id | `GET /listings/:id` | Yes | Yes |
| Notifications list | `GET /notifications` | Yes | Yes |
| Mark notification read | `PATCH /notifications/:id/read` | Yes | Yes |
| Mark notification unread | `PATCH /notifications/:id/unread` | Mock only | Not present in current real API docs/backend route |
| Frontend listing notification bridge | `POST /notifications` in mock mode, localStorage fallback otherwise | Yes | Not present in current real API docs/backend route; not used by real frontend flow |
| Payment page load | `GET /orders/me`, `GET /orders/:id` | Yes | Real backend uses different order paths |
| Payment complete | `PATCH /orders/:id/pay` | Yes | Real backend uses payment-session routes |

## Notes for Backend Handoff

When the real Postman API is complete, prefer updating service/API utility files rather than page components:

- `src/utils/apiClient.js` for base URL and auth headers.
- `src/utils/apiConfig.js` for all frontend endpoint constants.
- `src/utils/authApi.js` for login, register, OTP, profile, and logout calls.
- `src/utils/listingApi.js` for listing endpoint names/payload shape.
- `src/utils/notificationApi.js` for removing the temporary frontend notification bridge.
- `src/utils/paymentApi.js` for replacing the temporary mark-paid flow with the final payment-session flow.

Current real notification behavior:

- `GET /notifications` returns `{ success: true, data: [...] }` for the authenticated user.
- `PATCH /notifications/:id/read` marks one notification as read.
- No published real `POST /notifications` endpoint is available to the frontend.
- Listing creation/update currently returns listing data only; backend support is needed if publishing a listing should create a database notification.

Do not remove `mock-api` until frontend testing is finished.
