import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse } from '@/lib/utils'
import ExcelJS from 'exceljs'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Increase timeout for Vercel deployment
export const maxDuration = 60 // seconds

// GET /api/export/excel-purchases - Export all purchases with modern formatting
export async function GET(request: NextRequest) {
  try {
    console.log('Starting Purchases Excel export generation...')
    
    // Fetch all purchases with related data
    const purchases = await prisma.olivePurchase.findMany({
      include: {
        safe: {
          select: {
            name: true,
            capacity: true,
            currentStock: true
          }
        }
      },
      orderBy: {
        purchaseDate: 'desc'
      }
    })
    
    console.log(`Fetched ${purchases.length} purchases for export`)

    // Create new workbook
    const workbook = new ExcelJS.Workbook()
    
    // Set workbook properties
    workbook.creator = 'Huilerie Management System'
    workbook.created = new Date()
    workbook.modified = new Date()
    
    // ==================== MAIN PURCHASES SHEET ====================
    const mainSheet = workbook.addWorksheet('Achats', {
      properties: { 
        defaultRowHeight: 22,
        tabColor: { argb: 'FF6B8E4B' }
      },
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
    })

    // Define columns with modern widths (removed Olives column)
    mainSheet.columns = [
      { header: '📅 Date', key: 'date', width: 16 },
      { header: '👨‍🌾 Agriculteur', key: 'farmer', width: 28 },
      { header: '📞 Téléphone', key: 'phone', width: 16 },
      { header: '🏺 Coffre', key: 'safe', width: 24 },
      { header: '💰 Prix/kg (DT)', key: 'pricePerKg', width: 18 },
      { header: '🛢️ Huile Produite (kg)', key: 'oil', width: 22 },
      { header: '📊 Rendement (%)', key: 'yield', width: 20 },
      { header: '💵 Coût Total (DT)', key: 'total', width: 20 },
      { header: '📝 Notes', key: 'notes', width: 35 },
      { header: '⏰ Créé le', key: 'created', width: 20 }
    ]

    // Style header row with modern gradient and more height for icons
    const headerRow = mainSheet.getRow(1)
    headerRow.height = 45
    headerRow.font = { 
      name: 'Segoe UI', 
      size: 12, 
      bold: true, 
      color: { argb: 'FFFFFFFF' } 
    }
    headerRow.alignment = { 
      vertical: 'middle', 
      horizontal: 'center',
      wrapText: true,
      indent: 0
    }
    
    // Apply gradient background to header
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF6B8E4B' }
      }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF5A7A3F' } },
        bottom: { style: 'medium', color: { argb: 'FF5A7A3F' } },
        left: { style: 'thin', color: { argb: 'FF5A7A3F' } },
        right: { style: 'thin', color: { argb: 'FF5A7A3F' } }
      }
    })

    // Add data rows with alternating colors (removed olives)
    purchases.forEach((purchase, index) => {
      const row = mainSheet.addRow({
        date: new Date(purchase.purchaseDate).toLocaleDateString('fr-FR'),
        farmer: purchase.farmerName,
        phone: purchase.farmerPhone || 'N/A',
        safe: purchase.safe.name,
        pricePerKg: Number(purchase.pricePerKg),
        oil: purchase.oilProduced ? Number(purchase.oilProduced) : 'En attente',
        yield: purchase.yieldPercentage ? `${Number(purchase.yieldPercentage).toFixed(2)}%` : 'N/A',
        total: Number(purchase.totalCost),
        notes: purchase.notes || '',
        created: new Date(purchase.createdAt).toLocaleString('fr-FR')
      })

      // Modern alternating row colors
      const isEven = index % 2 === 0
      row.eachCell((cell, colNumber) => {
        // Font styling - Make oil column bold
        const isOilColumn = colNumber === 6
        cell.font = { 
          name: 'Segoe UI', 
          size: 10,
          bold: isOilColumn && typeof cell.value === 'number' // Bold for oil values
        }
        cell.alignment = { 
          vertical: 'middle',
          horizontal: colNumber <= 3 || colNumber === 4 || colNumber === 9 ? 'left' : 'right',
          wrapText: colNumber === 9 // Wrap notes
        }
        
        // Alternating background
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isEven ? 'FFF8F9FA' : 'FFFFFFFF' }
        }
        
        // Subtle borders
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE9ECEF' } },
          bottom: { style: 'thin', color: { argb: 'FFE9ECEF' } },
          left: { style: 'thin', color: { argb: 'FFE9ECEF' } },
          right: { style: 'thin', color: { argb: 'FFE9ECEF' } }
        }

        // Format numbers with 3 decimals
        if (colNumber === 5) { // PricePerKg
          cell.numFmt = '#,##0.000'
        }
        if (colNumber === 6 && typeof cell.value === 'number') { // Oil - BOLD
          cell.numFmt = '#,##0.000'
          cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF15803D' } } // Bold green
        }
        if (colNumber === 8) { // Total cost
          cell.numFmt = '#,##0.000'
          cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFD97706' } }
        }

        // Highlight pending oil
        if (colNumber === 6 && cell.value === 'En attente') {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFEF3C7' }
          }
          cell.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FFF59E0B' } }
        }
      })
    })

    // Add summary row at the bottom (removed olives)
    const summaryRow = mainSheet.addRow({
      date: '',
      farmer: '',
      phone: '',
      safe: 'TOTAUX:',
      pricePerKg: '',
      oil: { formula: `SUMIF(F2:F${purchases.length + 1},"<>En attente")` },
      yield: '',
      total: { formula: `SUM(H2:H${purchases.length + 1})` },
      notes: `${purchases.length} achats`,
      created: ''
    })

    summaryRow.height = 30
    summaryRow.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
    summaryRow.alignment = { vertical: 'middle', horizontal: 'right' }
    summaryRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2C3E50' }
      }
      cell.border = {
        top: { style: 'double', color: { argb: 'FF34495E' } },
        bottom: { style: 'double', color: { argb: 'FF34495E' } },
        left: { style: 'thin', color: { argb: 'FF34495E' } },
        right: { style: 'thin', color: { argb: 'FF34495E' } }
      }
      if (cell.value && typeof cell.value === 'object' && 'formula' in cell.value) {
        cell.numFmt = '#,##0.000'
      }
    })

    // ==================== STATS BY CITERNE SHEET ====================
    const statsSheet = workbook.addWorksheet('Stats par Coffre', {
      properties: { 
        defaultRowHeight: 22,
        tabColor: { argb: 'FF8B5CF6' }
      },
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
    })

    // Group purchases by safe
    const purchasesBySafe = purchases.reduce((acc: any, purchase) => {
      const safeName = purchase.safe.name
      if (!acc[safeName]) {
        acc[safeName] = {
          purchases: [],
          totalOlives: 0,
          totalOil: 0,
          totalCost: 0,
          capacity: Number(purchase.safe.capacity),
          currentStock: Number(purchase.safe.currentStock)
        }
      }
      acc[safeName].purchases.push(purchase)
      acc[safeName].totalOlives += Number(purchase.oliveWeight)
      acc[safeName].totalOil += Number(purchase.oilProduced || 0)
      acc[safeName].totalCost += Number(purchase.totalCost)
      return acc
    }, {})

    // Define stats columns (removed olives)
    statsSheet.columns = [
      { header: '🏺 Coffre', key: 'safe', width: 28 },
      { header: '📦 Nb Achats', key: 'count', width: 16 },
      { header: '🛢️ Total Huile (kg)', key: 'oil', width: 22 },
      { header: '💰 Total Coût (DT)', key: 'cost', width: 22 },
      { header: '📊 Rendement Moyen (%)', key: 'avgYield', width: 24 },
      { header: '📏 Capacité (kg)', key: 'capacity', width: 20 },
      { header: '📦 Stock Actuel (kg)', key: 'stock', width: 22 },
      { header: '📈 Utilisation (%)', key: 'utilization', width: 20 }
    ]

    // Style stats header
    const statsHeaderRow = statsSheet.getRow(1)
    statsHeaderRow.height = 45
    statsHeaderRow.font = { 
      name: 'Segoe UI', 
      size: 12, 
      bold: true, 
      color: { argb: 'FFFFFFFF' } 
    }
    statsHeaderRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true, indent: 0 }
    statsHeaderRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF8B5CF6' }
      }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF7C3AED' } },
        bottom: { style: 'medium', color: { argb: 'FF7C3AED' } },
        left: { style: 'thin', color: { argb: 'FF7C3AED' } },
        right: { style: 'thin', color: { argb: 'FF7C3AED' } }
      }
    })

    // Add stats data
    Object.entries(purchasesBySafe).forEach(([safeName, data]: [string, any], index) => {
      const purchasesWithOil = data.purchases.filter((p: any) => p.oilProduced)
      const avgYield = purchasesWithOil.length > 0
        ? purchasesWithOil.reduce((sum: number, p: any) => sum + Number(p.yieldPercentage || 0), 0) / purchasesWithOil.length
        : 0

      const row = statsSheet.addRow({
        safe: safeName,
        count: data.purchases.length,
        oil: data.totalOil,
        cost: data.totalCost,
        avgYield: avgYield,
        capacity: data.capacity,
        stock: data.currentStock,
        utilization: (data.currentStock / data.capacity) * 100
      })

      const isEven = index % 2 === 0
      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Segoe UI', size: 10 }
        cell.alignment = { vertical: 'middle', horizontal: colNumber === 1 ? 'left' : 'right' }
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isEven ? 'FFF8F9FA' : 'FFFFFFFF' }
        }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE9ECEF' } },
          bottom: { style: 'thin', color: { argb: 'FFE9ECEF' } },
          left: { style: 'thin', color: { argb: 'FFE9ECEF' } },
          right: { style: 'thin', color: { argb: 'FFE9ECEF' } }
        }

        // Format numbers (adjusted for removed olives column)
        if (colNumber === 3 || colNumber === 4) { // Oil and Cost
          cell.numFmt = '#,##0.000'
        }
        if (colNumber === 3) { // Oil - BOLD
          cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF15803D' } }
        }
        if (colNumber === 5 || colNumber === 8) { // Yield and Utilization
          cell.numFmt = '0.00"%"'
        }
        if (colNumber === 6 || colNumber === 7) { // Capacity and Stock
          cell.numFmt = '#,##0.00'
        }

        // Highlight high utilization
        if (colNumber === 8) {
          const utilization = cell.value as number
          if (utilization > 90) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFECACA' }
            }
            cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFDC2626' } }
          } else if (utilization > 75) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFEF3C7' }
            }
            cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFF59E0B' } }
          }
        }
      })
    })

    // Generate Excel file buffer
    console.log('Generating Excel buffer...')
    const buffer = await workbook.xlsx.writeBuffer()
    console.log(`Excel file generated successfully! Size: ${(buffer.length / 1024).toFixed(2)} KB`)

    // Generate filename with current date
    const date = new Date()
    const filename = `achats_huilerie_${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}.xlsx`

    // Return Excel file
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
  } catch (error) {
    console.error('Error generating Purchases Excel export:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la génération de l\'export Excel des achats'),
      { status: 500 }
    )
  }
}
