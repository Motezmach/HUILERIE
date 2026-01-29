import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse } from '@/lib/utils'
import ExcelJS from 'exceljs'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Increase timeout for Vercel deployment
export const maxDuration = 60 // seconds

// GET /api/export/excel-employees - Export all employees with modern formatting
export async function GET(request: NextRequest) {
  try {
    console.log('Starting Employees Excel export generation...')
    
    // Fetch all employees with their attendance and payments
    const employees = await prisma.employee.findMany({
      include: {
        attendance: {
          orderBy: {
            date: 'desc'
          },
          take: 100 // Last 100 attendance records per employee
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
    
    console.log(`Fetched ${employees.length} employees for export`)

    // Create new workbook
    const workbook = new ExcelJS.Workbook()
    
    // Set workbook properties
    workbook.creator = 'Huilerie Management System'
    workbook.created = new Date()
    workbook.modified = new Date()
    
    // ==================== MAIN EMPLOYEES SHEET ====================
    const mainSheet = workbook.addWorksheet('Employés', {
      properties: { 
        defaultRowHeight: 22,
        tabColor: { argb: 'FF3B82F6' }
      },
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
    })

    // Define columns with modern widths
    mainSheet.columns = [
      { header: '👤 Nom Complet', key: 'name', width: 30 },
      { header: '📞 Téléphone', key: 'phone', width: 18 },
      { header: '💼 Poste', key: 'position', width: 25 },
      { header: '📅 Date d\'Embauche', key: 'hireDate', width: 20 },
      { header: '📊 Statut', key: 'status', width: 15 },
      { header: '✅ Présences', key: 'presences', width: 16 },
      { header: '❌ Absences', key: 'absences', width: 16 },
      { header: '⏱️ Demi-Journées', key: 'halfDays', width: 18 },
      { header: '💰 Total Payé (DT)', key: 'totalPaid', width: 20 },
      { header: '📝 Dernier Paiement', key: 'lastPayment', width: 20 },
      { header: '⏰ Créé le', key: 'created', width: 20 }
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
        fgColor: { argb: 'FF3B82F6' }
      }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF2563EB' } },
        bottom: { style: 'medium', color: { argb: 'FF2563EB' } },
        left: { style: 'thin', color: { argb: 'FF2563EB' } },
        right: { style: 'thin', color: { argb: 'FF2563EB' } }
      }
    })

    // Add data rows with alternating colors
    employees.forEach((employee, index) => {
      // Calculate attendance stats
      const presences = employee.attendance.filter(a => a.status === 'PRESENT').length
      const absences = employee.attendance.filter(a => a.status === 'ABSENT').length
      const halfDays = employee.attendance.filter(a => a.status === 'HALF_DAY').length
      
      // Calculate total payments
      const totalPaid = employee.payments.reduce((sum, p) => sum + Number(p.amount), 0)
      
      // Get last payment
      const lastPayment = employee.payments.length > 0
        ? new Date(employee.payments[0].paymentDate).toLocaleDateString('fr-FR')
        : 'Aucun'

      const row = mainSheet.addRow({
        name: employee.name,
        phone: employee.phone || 'N/A',
        position: employee.position || 'Non spécifié',
        hireDate: new Date(employee.hireDate).toLocaleDateString('fr-FR'),
        status: employee.isActive ? 'Actif' : 'Inactif',
        presences: presences,
        absences: absences,
        halfDays: halfDays,
        totalPaid: totalPaid,
        lastPayment: lastPayment,
        created: new Date(employee.createdAt).toLocaleString('fr-FR')
      })

      // Modern alternating row colors
      const isEven = index % 2 === 0
      row.eachCell((cell, colNumber) => {
        // Font styling
        cell.font = { name: 'Segoe UI', size: 10 }
        cell.alignment = { 
          vertical: 'middle',
          horizontal: colNumber <= 4 || colNumber === 5 || colNumber === 10 || colNumber === 11 ? 'left' : 'center',
          wrapText: false
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

        // Status column styling
        if (colNumber === 5) {
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

        // Attendance numbers styling
        if (colNumber === 6) { // Presences
          cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF059669' } }
        }
        if (colNumber === 7) { // Absences
          if (cell.value && Number(cell.value) > 0) {
            cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFDC2626' } }
          }
        }
        if (colNumber === 8) { // Half days
          cell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FFF59E0B' } }
        }

        // Total paid - bold amber
        if (colNumber === 9) {
          cell.numFmt = '#,##0.000'
          cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFD97706' } }
          cell.alignment = { vertical: 'middle', horizontal: 'right' }
        }
      })
    })

    // Add summary row at the bottom
    const totalEmployees = employees.length
    const activeEmployees = employees.filter(e => e.isActive).length
    const inactiveEmployees = employees.filter(e => !e.isActive).length
    const totalPaidAll = employees.reduce((sum, e) => 
      sum + e.payments.reduce((pSum, p) => pSum + Number(p.amount), 0), 0
    )

    const summaryRow = mainSheet.addRow({
      name: `TOTAUX (${totalEmployees} employés)`,
      phone: '',
      position: `Actifs: ${activeEmployees} | Inactifs: ${inactiveEmployees}`,
      hireDate: '',
      status: '',
      presences: '',
      absences: '',
      halfDays: '',
      totalPaid: totalPaidAll,
      lastPayment: '',
      created: ''
    })

    summaryRow.height = 30
    summaryRow.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
    summaryRow.alignment = { vertical: 'middle', horizontal: 'left' }
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
      if (colNumber === 9) {
        cell.numFmt = '#,##0.000'
        cell.alignment = { vertical: 'middle', horizontal: 'right' }
      }
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
    employees.forEach(employee => {
      employee.payments.forEach(payment => {
        allPayments.push({
          employeeName: employee.name,
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
      { header: '👤 Employé', key: 'employee', width: 30 },
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
        employee: payment.employeeName,
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
    const paymentsSummaryRow = paymentsSheet.addRow({
      employee: `TOTAL (${allPayments.length} paiements)`,
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

    // Generate Excel file buffer
    console.log('Generating Excel buffer...')
    const buffer = await workbook.xlsx.writeBuffer()
    console.log(`Excel file generated successfully! Size: ${(buffer.length / 1024).toFixed(2)} KB`)

    // Generate filename with current date
    const date = new Date()
    const filename = `employes_huilerie_${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}.xlsx`

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
    console.error('Error generating Employees Excel export:', error)
    return NextResponse.json(
      createErrorResponse('Erreur lors de la génération de l\'export Excel des employés'),
      { status: 500 }
    )
  }
}
