import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse } from '@/lib/utils'
import ExcelJS from 'exceljs'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// GET /api/export/excel - Export all data as formatted Excel
export async function GET(request: NextRequest) {
  try {
    // Fetch all farmers with their complete data
    const farmers = await prisma.farmer.findMany({
      include: {
        processingSessions: {
          include: {
            sessionBoxes: true,
            paymentTransactions: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Create new workbook and worksheet
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Données Huilerie', {
      properties: { defaultRowHeight: 20 }
    })

    // Define columns with widths
    worksheet.columns = [
      { header: 'Nom Agriculteur', key: 'name', width: 25 },
      { header: 'Téléphone', key: 'phone', width: 15 },
      { header: 'Nombre de Boîtes', key: 'boxCount', width: 18 },
      { header: 'IDs des Boîtes', key: 'boxIds', width: 30 },
      { header: 'Nombre de Sessions', key: 'sessionCount', width: 20 },
      { header: 'Sessions Payées', key: 'paidSessions', width: 18 },
      { header: 'Sessions Non Payées', key: 'unpaidSessions', width: 20 },
      { header: 'Montant Total Dû (DT)', key: 'totalDue', width: 22 },
      { header: 'Montant Restant (DT)', key: 'remaining', width: 22 },
      { header: 'Total Olives (kg)', key: 'totalOlives', width: 18 },
      { header: 'Total Huile (kg)', key: 'totalOil', width: 18 },
      { header: 'Rendement (%)', key: 'yield', width: 15 },
      { header: 'Date Ajout', key: 'dateAdded', width: 15 }
    ]

    // Style the header row
    const headerRow = worksheet.getRow(1)
    headerRow.height = 30
    headerRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF6B8E4B' } // Green color
    }
    headerRow.alignment = { 
      vertical: 'middle', 
      horizontal: 'center',
      wrapText: true 
    }
    headerRow.border = {
      top: { style: 'medium', color: { argb: 'FF000000' } },
      left: { style: 'medium', color: { argb: 'FF000000' } },
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
      right: { style: 'medium', color: { argb: 'FF000000' } }
    }

    // Apply borders to all header cells
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF000000' } },
        left: { style: 'medium', color: { argb: 'FF000000' } },
        bottom: { style: 'medium', color: { argb: 'FF000000' } },
        right: { style: 'medium', color: { argb: 'FF000000' } }
      }
    })

    // Add data rows
    farmers.forEach((farmer, index) => {
      // Calculate all statistics
      const sessions = farmer.processingSessions || []
      const completedSessions = sessions.filter(s => Number(s.oilWeight) > 0)
      
      // Payment statistics
      const paidSessions = sessions.filter(s => s.paymentStatus === 'PAID').length
      const unpaidSessions = sessions.filter(s => s.paymentStatus === 'UNPAID' || s.paymentStatus === 'PARTIAL').length
      
      // Financial statistics
      const totalAmountDue = sessions
        .filter(s => s.totalPrice !== null)
        .reduce((sum, s) => sum + Number(s.totalPrice || 0), 0)
      
      const totalAmountPaid = sessions
        .reduce((sum, s) => sum + Number(s.amountPaid || 0), 0)
      
      const amountRemaining = totalAmountDue - totalAmountPaid
      
      // Production statistics
      const totalOliveWeight = sessions
        .reduce((sum, s) => sum + Number(s.totalBoxWeight || 0), 0)
      
      const totalOilWeight = completedSessions
        .reduce((sum, s) => sum + Number(s.oilWeight || 0), 0)
      
      const averageYield = totalOliveWeight > 0 
        ? (totalOilWeight / totalOliveWeight) * 100
        : 0
      
      // Get all unique box IDs used across all sessions
      const allBoxIds = new Set<string>()
      sessions.forEach(session => {
        session.sessionBoxes.forEach(sb => {
          allBoxIds.add(sb.boxId)
        })
      })
      const boxIdsString = Array.from(allBoxIds).sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, '')) || 0
        const numB = parseInt(b.replace(/\D/g, '')) || 0
        return numA - numB
      }).join(', ')

      // Add row
      const row = worksheet.addRow({
        name: farmer.name,
        phone: farmer.phone || 'N/A',
        boxCount: allBoxIds.size,
        boxIds: boxIdsString || 'N/A',
        sessionCount: sessions.length,
        paidSessions: paidSessions,
        unpaidSessions: unpaidSessions,
        totalDue: totalAmountDue,
        remaining: amountRemaining,
        totalOlives: totalOliveWeight,
        totalOil: totalOilWeight,
        yield: averageYield,
        dateAdded: new Date(farmer.dateAdded)
      })

      // Style data rows
      row.height = 25
      row.alignment = { 
        vertical: 'middle', 
        horizontal: 'left',
        wrapText: true 
      }
      
      // Alternating row colors for better readability
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: index % 2 === 0 ? 'FFFFFFFF' : 'FFF5F5F5' }
      }

      // Apply borders to all cells in the row
      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
        }

        // Center align numbers
        if (colNumber >= 3 && colNumber <= 12) {
          cell.alignment = { 
            vertical: 'middle', 
            horizontal: 'center',
            wrapText: true 
          }
        }

        // Format numbers with 2 decimals
        if (colNumber >= 8 && colNumber <= 12) {
          cell.numFmt = '#,##0.00'
        }

        // Format date
        if (colNumber === 13) {
          cell.numFmt = 'dd/mm/yyyy'
          cell.alignment = { 
            vertical: 'middle', 
            horizontal: 'center',
            wrapText: true 
          }
        }
      })
    })

    // Generate Excel file buffer
    const buffer = await workbook.xlsx.writeBuffer()

    // Generate filename with current date
    const date = new Date()
    const filename = `huilerie_export_${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}.xlsx`

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
    console.error('Error generating Excel export:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la génération de l\'export Excel'),
      { status: 500 }
    )
  }
}


