# HUILERIE MASMOUDI - API Testing Collection for Postman

## 🚀 Base URL
```
http://localhost:3001/api
```

---

## 🔍 1. HEALTH CHECK

### GET Health Check
**URL:** `GET http://localhost:3001/api/health`

**Headers:**
```
Content-Type: application/json
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-20T10:30:00Z",
    "database": "connected",
    "version": "1.0.0"
  },
  "message": "Service en bonne santé"
}
```

---

## 👨‍🌾 2. FARMERS MANAGEMENT

### GET All Farmers
**URL:** `GET http://localhost:3001/api/farmers`

**Query Parameters:**
```
page=1
limit=10
search=Ahmed
type=all
paymentStatus=all
sortBy=name
sortOrder=asc
includeBoxes=false
includeSessions=false
```

**Headers:**
```
Content-Type: application/json
```

### POST Create Farmer
**URL:** `POST http://localhost:3001/api/farmers`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "name": "Ahmed Ben Salem",
  "phone": "27408877",
  "type": "small"
}
```

### POST Create Large Farmer
**URL:** `POST http://localhost:3001/api/farmers`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "name": "Mohamed Karray",
  "phone": "98765432",
  "type": "large"
}
```

### GET Single Farmer
**URL:** `GET http://localhost:3001/api/farmers/{{farmerId}}`
*Replace {{farmerId}} with actual farmer ID from POST response*

**Headers:**
```
Content-Type: application/json
```

### PUT Update Farmer
**URL:** `PUT http://localhost:3001/api/farmers/{{farmerId}}`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "name": "Ahmed Ben Salem Updated",
  "phone": "27408888",
  "type": "large"
}
```

### DELETE Farmer
**URL:** `DELETE http://localhost:3001/api/farmers/{{farmerId}}`

**Headers:**
```
Content-Type: application/json
```

---

## 📦 3. BOXES MANAGEMENT

### GET All Boxes (Simple)
**URL:** `GET http://localhost:3001/api/boxes`

**Headers:**
```
Content-Type: application/json
```

### GET All Boxes with Filtering
**URL:** `GET http://localhost:3001/api/boxes`

**Query Parameters:**
```
page=1
limit=10
farmerId=503ea66f-2b27-429e-a90d-831ae98a802e
type=all
isProcessed=false
sortBy=id
sortOrder=asc
```

**Headers:**
```
Content-Type: application/json
```

### GET Boxes by Type (Normal)
**URL:** `GET http://localhost:3001/api/boxes?type=normal&isProcessed=false`

**Headers:**
```
Content-Type: application/json
```

### GET Boxes by Type (Nchira)
**URL:** `GET http://localhost:3001/api/boxes?type=nchira&isProcessed=false`

**Headers:**
```
Content-Type: application/json
```

### GET Boxes by Type (Chkara)
**URL:** `GET http://localhost:3001/api/boxes?type=chkara&isProcessed=false`

**Headers:**
```
Content-Type: application/json
```

### POST Validate Box ID (Normal/Nchira - Numbers 1-600)
**URL:** `POST http://localhost:3001/api/boxes/validate`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "id": "123",
  "type": "normal"
}
```

### POST Validate Box ID (Chkara - Must start with "Chkara")
**URL:** `POST http://localhost:3001/api/boxes/validate`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "id": "Chkara001",
  "type": "chkara"
}
```

### POST Create Normal Box
**URL:** `POST http://localhost:3001/api/boxes`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "id": "145",
  "weight": 25.5,
  "type": "normal",
  "farmerId": "503ea66f-2b27-429e-a90d-831ae98a802e"
}
```

### POST Create Nchira Box
**URL:** `POST http://localhost:3001/api/boxes`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "id": "246",
  "weight": 30.0,
  "type": "nchira",
  "farmerId": "503ea66f-2b27-429e-a90d-831ae98a802e"
}
```

### POST Create Chkara Box
**URL:** `POST http://localhost:3001/api/boxes`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "id": "Chkara001",
  "weight": 45.0,
  "type": "chkara",
  "farmerId": "503ea66f-2b27-429e-a90d-831ae98a802e"
}
```

### GET Single Box
**URL:** `GET http://localhost:3001/api/boxes/145`

**Headers:**
```
Content-Type: application/json
```

### PUT Update Box Weight
**URL:** `PUT http://localhost:3001/api/boxes/145`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "weight": 28.0
}
```

### PUT Update Box Type and Weight
**URL:** `PUT http://localhost:3001/api/boxes/145`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "weight": 32.5,
  "type": "nchira"
}
```

### PUT Bulk Select Boxes
**URL:** `PUT http://localhost:3001/api/boxes`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "boxIds": ["145", "246", "Chkara001"],
  "action": "select"
}
```

### PUT Bulk Unselect Boxes
**URL:** `PUT http://localhost:3001/api/boxes`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "boxIds": ["145", "246"],
  "action": "unselect"
}
```

### PUT Bulk Delete Boxes
**URL:** `PUT http://localhost:3001/api/boxes`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "boxIds": ["145", "246"],
  "action": "delete"
}
```

### DELETE Single Box
**URL:** `DELETE http://localhost:3001/api/boxes/145`

**Headers:**
```
Content-Type: application/json
```

---

## 📦 4. FARMER'S BOXES

### GET Farmer's Boxes
**URL:** `GET http://localhost:3001/api/farmers/503ea66f-2b27-429e-a90d-831ae98a802e/boxes`

**Headers:**
```
Content-Type: application/json
```

### POST Add Single Box to Farmer
**URL:** `POST http://localhost:3001/api/farmers/503ea66f-2b27-429e-a90d-831ae98a802e/boxes`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "id": "147",
  "type": "normal",
  "weight": 25.5
}
```

### POST Add Multiple Boxes to Farmer (Bulk)
**URL:** `POST http://localhost:3001/api/farmers/503ea66f-2b27-429e-a90d-831ae98a802e/boxes`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "boxes": [
    {
      "id": "2",
      "type": "normal",
      "weight": 30.0
    },
    {
      "id": "3",
      "type": "nchira",
      "weight": 28.5
    },
    {
      "id": "Chkara001",
      "type": "chkara",
      "weight": 35.0
    }
  ]
}
```

---

## ⚙️ 5. PROCESSING SESSIONS

### GET All Sessions
**URL:** `GET http://localhost:3001/api/sessions`

**Query Parameters:**
```
page=1
limit=10
farmerId={{farmerId}}
processingStatus=all
paymentStatus=all
includeFarmer=true
includeBoxes=true
sortBy=createdAt
sortOrder=desc
```

**Headers:**
```
Content-Type: application/json
```

### POST Create Processing Session
**URL:** `POST http://localhost:3001/api/sessions`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "farmerId": "{{farmerId}}",
  "boxIds": ["1", "2", "3"],
  "totalBoxWeight": 84.0,
  "boxCount": 3,
  "totalPrice": 12.60
}
```

### GET Single Session
**URL:** `GET http://localhost:3001/api/sessions/{{sessionId}}`

**Headers:**
```
Content-Type: application/json
```

### PUT Update Session
**URL:** `PUT http://localhost:3001/api/sessions/{{sessionId}}`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "notes": "Session updated with new information",
  "processingStatus": "processed"
}
```

### PUT Complete Processing Session
**URL:** `PUT http://localhost:3001/api/sessions/{{sessionId}}/complete`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "oilWeight": 12.5,
  "processingDate": "2024-01-20"
}
```

### PUT Mark Session as Paid
**URL:** `PUT http://localhost:3001/api/sessions/{{sessionId}}/payment`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "status": "paid"
}
```

### PUT Mark Session as Unpaid
**URL:** `PUT http://localhost:3001/api/sessions/{{sessionId}}/payment`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "status": "unpaid"
}
```

### DELETE Session
**URL:** `DELETE http://localhost:3001/api/sessions/{{sessionId}}`

**Headers:**
```
Content-Type: application/json
```

---

## 📊 6. DASHBOARD

### GET Dashboard Data
**URL:** `GET http://localhost:3001/api/dashboard`

**Query Parameters:**
```
date=2024-01-20
refresh=false
```

**Headers:**
```
Content-Type: application/json
```

### GET Dashboard Data (Force Refresh)
**URL:** `GET http://localhost:3001/api/dashboard?refresh=true`

**Headers:**
```
Content-Type: application/json
```

---

## 🧪 7. TESTING WORKFLOW

### Step 1: Health Check
Test the health endpoint first to ensure the API is running.

### Step 2: Create Farmers
Create 2-3 farmers with different types (small/large) to test the system.

### Step 3: Add Boxes
Add various types of boxes to farmers:
- Normal boxes (IDs 1-600)
- Nchira boxes (IDs 1-600) 
- Chkara boxes (auto-generated IDs)

### Step 4: Create Sessions
Create processing sessions by selecting boxes from farmers.

### Step 5: Process Sessions
Complete the processing by adding oil weight and processing date.

### Step 6: Handle Payments
Mark sessions as paid/unpaid to test payment workflow.

### Step 7: Dashboard
Check dashboard to see all metrics and recent activity.

---

## 🔧 8. TESTING TIPS

### Variables in Postman
Create these environment variables in Postman:
- `baseUrl`: `http://localhost:3001/api`
- `farmerId`: (copy from farmer creation response)
- `sessionId`: (copy from session creation response)
- `boxId`: (use box IDs like "1", "2", etc.)

### Expected Error Responses
All endpoints return errors in this format:
```json
{
  "success": false,
  "error": "Error message in French"
}
```

### Success Response Format
All successful responses follow this pattern:
```json
{
  "success": true,
  "data": { /* actual data */ },
  "message": "Success message in French"
}
```

---

## 🚀 Quick Start Testing Sequence

1. **Health Check**: `GET /health`
2. **Create Farmer**: `POST /farmers` with small farmer data
3. **Add Boxes**: `POST /farmers/{id}/boxes` with multiple boxes
4. **Create Session**: `POST /sessions` with box selection
5. **Complete Session**: `PUT /sessions/{id}/complete` with oil weight
6. **Mark Paid**: `PUT /sessions/{id}/payment` with paid status
7. **Check Dashboard**: `GET /dashboard` to see updated metrics

Start with this sequence and let me know the responses you get! 🎯
