"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Racine du tableau
 */
export const Table = React.forwardRef<
  HTMLTableElement,
  React.TableHTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="w-full overflow-auto">
    <table
      ref={ref}
      className={cn(
        "w-full caption-bottom text-sm",
        className
      )}
      {...props}
    />
  </div>
))
Table.displayName = "Table"

/**
 * Légende ou titre du tableau
 */
export const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn(
      "mt-2 text-sm text-gray-500 dark:text-gray-400",
      className
    )}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

/**
 * Entête du tableau (englobe une ou plusieurs lignes <tr>)
 */
export const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn("[&_tr]:border-b", className)}
    {...props}
  />
))
TableHeader.displayName = "TableHeader"

/**
 * Corps du tableau (englobe les lignes de données)
 */
export const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
))
TableBody.displayName = "TableBody"

/**
 * Ligne du tableau
 */
export const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b transition-colors hover:bg-gray-50 data-[state=selected]:bg-gray-100 dark:hover:bg-gray-800/50",
      className
    )}
    {...props}
  />
))
TableRow.displayName = "TableRow"

/**
 * Cellule d'entête (dans l'entête <thead>)
 */
export const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-10 px-2 text-left align-middle font-medium text-gray-600 dark:text-gray-300 [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
))
TableHead.displayName = "TableHead"

/**
 * Cellule de données
 */
export const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("p-2 align-middle", className)}
    {...props}
  />
))
TableCell.displayName = "TableCell"

/**
 * Pied de tableau (optionnel)
 */
export const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "bg-gray-100 font-medium text-gray-900 dark:bg-gray-800 dark:text-gray-100",
      className
    )}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"