import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse } from '@/lib/utils'
import ExcelJS from 'exceljs'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Increase timeout for Vercel deployment
export const maxDuration = 60 // seconds

// GET /api/export/excel-collectors - Export all collectors with modern formatting
export async function GET(request: NextRequest) {
  try {
    console.log('Starting Collectors Excel export generation...')
    
    // Fetch all collector groups with their collections and payments
    const groups = await prisma.collectorGroup.findMany({
      include: {
        collections: {
          orderBy: {
            collectionDate: 'desc'
          }
        },
        payments: {
          orderBy: {
            paymentDate: 'desc'
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })
    
    // Flatten all collections for the main sheet
    const allCollections: any[] = []
    groups.forEach(group => {
      group.collections.forEach(collection => {
        allCollections.push({
          groupName: group.name,
          ...collection
        })
      })
    })
    
    console.log(`Fetched ${groups.length} collector groups with ${allCollections.length} collections`)

    // Create new workbook
    const workbook = new ExcelJS.Workbook()
    
    // Set workbook properties
    workbook.creator = 'Huilerie Management System'
    workbook.created = new Date()
    workbook.modified = new Date()
    
    // ==================== MAIN COLLECTIONS SHEET ====================
    const mainSheet = workbook.addWorksheet('Collectes', {
      properties: { 
        defaultRowHeight: 22,
        tabColor: { argb: 'FFEF4444' }
      },
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
    })

    // Define columns with modern widths (removed Nchira, Prix, Montant)
    mainSheet.columns = [
      { header: '📅 Date', key: 'date', width: 18 },
      { header: '👥 Groupe', key: 'group', width: 25 },
      { header: '📍 Lieu', key: 'location', width: 30 },
      { header: '👤 Client', key: 'client', width: 30 },
      { header: '🫒 Chakra', key: 'chakra', width: 16 },
      { header: '🫒 Galba', key: 'galba', width: 16 },
      { header: '📊 Total Chakra', key: 'totalChakra', width: 20 },
      { header: '📝 Notes', key: 'notes', width: 40 },
      { header: '⏰ Créé le', key: 'created', width: 22 }
    ]

    // Style header row with modern gradient
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
        fgColor: { argb: 'FFEF4444' }
      }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFDC2626' } },
        bottom: { style: 'medium', color: { argb: 'FFDC2626' } },
        left: { style: 'thin', color: { argb: 'FFDC2626' } },
        right: { style: 'thin', color: { argb: 'FFDC2626' } }
      }
    })

    // Add data rows with alternating colors (removed Nchira, Prix, Montant)
    allCollections.forEach((collection, index) => {
      const row = mainSheet.addRow({
        date: new Date(collection.collectionDate).toLocaleDateString('fr-FR'),
        group: collection.groupName,
        location: collection.location,
        client: collection.clientName,
        chakra: collection.chakraCount,
        galba: collection.galbaCount,
        totalChakra: Number(collection.totalChakra),
        notes: collection.notes || '',
        created: new Date(collection.createdAt).toLocaleString('fr-FR')
      })

      // Modern alternating row colors
      const isEven = index % 2 === 0
      row.eachCell((cell, colNumber) => {
        // Font styling - Bold for total chakra
        const isTotalColumn = colNumber === 7
        cell.font = { 
          name: 'Segoe UI', 
          size: isTotalColumn ? 11 : 10,
          bold: isTotalColumn
        }
        cell.alignment = { 
          vertical: 'middle',
          horizontal: colNumber <= 4 || colNumber === 8 ? 'left' : 'center',
          wrapText: colNumber === 8
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

        // Format numbers - Total Chakra BOLD RED
        if (colNumber === 7) { // Total Chakra - BOLD
          cell.numFmt = '#,##0.00'
          cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFEF4444' } }
        }
      })
    })

    // Add summary row at the bottom
    const totalCollections = allCollections.length
    const totalChakraSum = allCollections.reduce((sum, c) => sum + Number(c.totalChakra), 0)

    const summaryRow = mainSheet.addRow({
      date: '',
      group: '',
      location: '',
      client: 'TOTAUX:',
      chakra: '',
      galba: '',
      totalChakra: totalChakraSum,
      notes: `${totalCollections} collectes`,
      created: ''
    })

    summaryRow.height = 30
    summaryRow.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
    summaryRow.alignment = { vertical: 'middle', horizontal: 'right' }
    summaryRow.eachCell((cell, colNumber) => {
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
      if (colNumber === 7) {
        cell.numFmt = '#,##0.00'
      }
    })

    // ==================== STATS BY GROUP SHEET ====================
    const statsSheet = workbook.addWorksheet('Stats par Groupe', {
      properties: { 
        defaultRowHeight: 22,
        tabColor: { argb: 'FF8B5CF6' }
      },
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
    })

    // Define stats columns (removed Total Nchira and Total Collecté)
    statsSheet.columns = [
      { header: '👥 Groupe', key: 'group', width: 28 },
      { header: '📊 Statut', key: 'status', width: 16 },
      { header: '📦 Nb Collectes', key: 'count', width: 18 },
      { header: '🫒 Total Chakra', key: 'totalChakra', width: 20 },
      { header: '💵 Total Payé (DT)', key: 'totalPaid', width: 22 },
      { header: '📝 Dernière Collecte', key: 'lastCollection', width: 24 }
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

    // Add stats data (removed Total Nchira and Balance)
    groups.forEach((group, index) => {
      const totalChakra = group.collections.reduce((sum, c) => sum + Number(c.totalChakra), 0)
      const totalPaid = group.payments.reduce((sum, p) => sum + Number(p.amount), 0)

      const lastCollection = group.collections.length > 0
        ? new Date(group.collections[0].collectionDate).toLocaleDateString('fr-FR')
        : 'Aucune'

      const row = statsSheet.addRow({
        group: group.name,
        status: group.isActive ? 'Actif' : 'Inactif',
        count: group.collections.length,
        totalChakra: totalChakra,
        totalPaid: totalPaid,
        lastCollection: lastCollection
      })

      const isEven = index % 2 === 0
      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Segoe UI', size: 10 }
        cell.alignment = { 
          vertical: 'middle', 
          horizontal: colNumber === 1 || colNumber === 9 ? 'left' : colNumber === 2 ? 'center' : 'right'
        }
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

        // Status styling
        if (colNumber === 2) {
          if (cell.value === 'Actif') {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFD1FAE5' }
            }
            cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF059669' } }
          } else {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFEE2E2' }
            }
            cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFDC2626' } }
          }
        }

        // Format numbers
        if (colNumber === 4) { // Total Chakra
          cell.numFmt = '#,##0.00'
          cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFEF4444' } }
        }
        if (colNumber === 5) { // Total Paid
          cell.numFmt = '#,##0.000'
          cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF059669' } }
        }
      })
    })

    // ==================== PAYMENTS SHEET ====================
    const paymentsSheet = workbook.addWorksheet('Paiements', {
      properties: { 
        defaultRowHeight: 22,
        tabColor: { argb: 'FF10B981' }
      },
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
    })

    // Flatten all payments
    const allPayments: any[] = []
    groups.forEach(group => {
      group.payments.forEach(payment => {
        allPayments.push({
          groupName: group.name,
          amount: Number(payment.amount),
          paymentDate: payment.paymentDate,
          notes: payment.notes,
          createdAt: payment.createdAt
        })
      })
    })

    // Sort by date descending
    allPayments.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())

    // Define payments columns
    paymentsSheet.columns = [
      { header: '👥 Groupe', key: 'group', width: 25 },
      { header: '💰 Montant (DT)', key: 'amount', width: 20 },
      { header: '📅 Date de Paiement', key: 'date', width: 22 },
      { header: '📝 Notes', key: 'notes', width: 40 },
      { header: '⏰ Créé le', key: 'created', width: 20 }
    ]

    // Style payments header
    const paymentsHeaderRow = paymentsSheet.getRow(1)
    paymentsHeaderRow.height = 45
    paymentsHeaderRow.font = { 
      name: 'Segoe UI', 
      size: 12, 
      bold: true, 
      color: { argb: 'FFFFFFFF' } 
    }
    paymentsHeaderRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true, indent: 0 }
    paymentsHeaderRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF10B981' }
      }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF059669' } },
        bottom: { style: 'medium', color: { argb: 'FF059669' } },
        left: { style: 'thin', color: { argb: 'FF059669' } },
        right: { style: 'thin', color: { argb: 'FF059669' } }
      }
    })

    // Add payment rows
    allPayments.forEach((payment, index) => {
      const row = paymentsSheet.addRow({
        group: payment.groupName,
        amount: payment.amount,
        date: new Date(payment.paymentDate).toLocaleDateString('fr-FR'),
        notes: payment.notes || '',
        created: new Date(payment.createdAt).toLocaleString('fr-FR')
      })

      const isEven = index % 2 === 0
      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Segoe UI', size: 10 }
        cell.alignment = { 
          vertical: 'middle',
          horizontal: colNumber === 1 || colNumber === 4 ? 'left' : colNumber === 2 ? 'right' : 'center',
          wrapText: colNumber === 4
        }
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
        if (colNumber === 2) {
          cell.numFmt = '#,##0.000'
          cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF059669' } }
        }
      })
    })

    // Add payments summary
    if (allPayments.length > 0) {
      const paymentsSummaryRow = paymentsSheet.addRow({
        group: `TOTAL (${allPayments.length} paiements)`,
        amount: { formula: `SUM(B2:B${allPayments.length + 1})` },
        date: '',
        notes: '',
        created: ''
      })

      paymentsSummaryRow.height = 30
      paymentsSummaryRow.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
      paymentsSummaryRow.alignment = { vertical: 'middle', horizontal: 'left' }
      paymentsSummaryRow.eachCell((cell, colNumber) => {
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
        if (colNumber === 2) {
          cell.numFmt = '#,##0.000'
          cell.alignment = { vertical: 'middle', horizontal: 'right' }
        }
      })
    }

    // Generate Excel file buffer
    console.log('Generating Excel buffer...')
    const buffer = await workbook.xlsx.writeBuffer()
    console.log(`Excel file generated successfully! Size: ${(buffer.length / 1024).toFixed(2)} KB`)

    // Generate filename with current date
    const date = new Date()
    const filename = `collecteurs_huilerie_${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}.xlsx`

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
    console.error('Error generating Collectors Excel export:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la génération de l\'export Excel des collecteurs'),
      { status: 500 }
    )
  }
}
