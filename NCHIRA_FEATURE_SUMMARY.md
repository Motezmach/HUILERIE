# 🔴 Nchira Collection Feature - Implementation Guide

## ✅ **What's Been Done:**

### 1. **Database Schema Updated** ✅
- Added `nchiraChakraCount` (نشيرة chakra)
- Added `nchiraGalbaCount` (نشيرة galba)  
- Updated `totalChakra` calculation to include nchira

### 2. **Form UI Added** ✅
- ✅ Red checkbox "✓ Inclure Nchira (نشيرة)"
- ✅ Conditional red-bordered inputs appear when checked
- ✅ Auto-normalization (5 galba = 1 chakra) for nchira too
- ✅ Live calculation shows nchira subtotal + grand total
- ✅ Professional red theme to distinguish from regular quantities

---

## 🔧 **Still Need To Do:**

### **1. Update Collections API**

**File:** `app/api/collections/route.ts`

In the POST handler, add nchira to data:
```typescript
const collection = await prisma.dailyCollection.create({
  data: {
    // ... existing fields
    nchiraChakraCount: parseInt(nchiraChakraCount || 0),
    nchiraGalbaCount: parseInt(nchiraGalbaCount || 0),
    // ...
  }
})
```

### **2. Update Collections API [id]/route.ts**

In the PUT handler, add nchira to updateData:
```typescript
if (nchiraChakraCount !== undefined) updateData.nchiraChakraCount = finalNchiraChakra
if (nchiraGalbaCount !== undefined) updateData.nchiraGalbaCount = finalNchiraGalba
```

### **3. Update Calculation Logic**

Change totalChakra calculation to:
```typescript
const totalChakra = new Decimal(chakraCount)
  .plus(new Decimal(galbaCount).dividedBy(5))
  .plus(new Decimal(nchiraChakraCount || 0))
  .plus(new Decimal(nchiraGalbaCount || 0).dividedBy(5))
```

### **4. Display Nchira on Collection Cards**

In the collection display (around line 1078), add nchira badges:
```tsx
{(collection.nchiraChakraCount > 0 || collection.nchiraGalbaCount > 0) && (
  <>
    <Badge className="bg-red-100 text-red-800 text-xs border-2 border-red-400">
      Nchira: {collection.nchiraChakraCount} ش
    </Badge>
    <Badge className="bg-red-100 text-red-800 text-xs border-2 border-red-400">
      {collection.nchiraGalbaCount} ق
    </Badge>
  </>
)}
```

### **5. Update Print View**

Add nchira columns to the print table (around line 684):
```html
<th>Nchira ش</th>
<th>Nchira ق</th>

<!-- In tbody -->
<td>{c.nchiraChakraCount || 0}</td>
<td>{c.nchiraGalbaCount || 0}</td>
```

---

## 📋 **Complete Code Changes Needed:**

I'll provide the exact code to add in the next response if you need it, or you can:
1. Run the migration to add the nchira fields to DB
2. The form UI is already done
3. Update the 3 API files as shown above
4. Update the display components as shown above

---

**The UI is ready, just need API and display updates!** 🎯

