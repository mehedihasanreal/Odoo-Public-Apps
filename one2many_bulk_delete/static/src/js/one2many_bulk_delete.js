/** @odoo-module **/
/**
 * One2Many Bulk Delete Widget for Odoo 16
 *
 * This module provides bulk delete functionality for one2many fields.
 * It allows users to select multiple records using checkboxes and delete them all at once.
 *
 * Features:
 * - Checkboxes for each record in the list
 * - "Select All" checkbox in the header
 * - Delete button that appears when records are selected
 * - Confirmation dialog before deletion
 *
 * Usage:
 * Add widget="one2many_bulk_delete" to any one2many field in your XML view
 */

import { registry } from "@web/core/registry";
import { X2ManyField } from "@web/views/fields/x2many/x2many_field";
import { ListRenderer } from "@web/views/list/list_renderer";
import { useService } from "@web/core/utils/hooks";
import { ConfirmationDialog } from "@web/core/confirmation_dialog/confirmation_dialog";
import { useState } from "@odoo/owl";

/**
 * Custom List Renderer with Bulk Delete Support for Odoo 16
 *
 * This renderer extends the standard ListRenderer to add checkbox selection
 * and bulk delete functionality for one2many fields.
 */
export class BulkDeleteListRenderer extends ListRenderer {
    setup() {
        super.setup();
    }

    /**
     * Override to conditionally show checkboxes based on parent record state
     * Checkboxes are hidden if the parent record is in a restricted state
     * @returns {boolean} True if checkboxes should be shown, false otherwise
     */
    get hasSelectors() {
        // Check if we should allow bulk delete based on parent record state
        if (this.props.allowBulkDelete !== undefined) {
            return this.props.allowBulkDelete;
        }
        return true; // Default: show checkboxes
    }

    /**
     * Handle "Select All" checkbox toggle
     * This is called when the user clicks the checkbox in the table header
     */
    toggleSelection() {
        const list = this.props.list;
        if (!this.canSelectRecord || !list) {
            return;
        }

        // X2Many lists don't have a selection array like regular list views,
        // so we check records directly by filtering for selected records
        const selectedCount = list.records.filter(r => r.selected).length;
        const allSelected = selectedCount === list.records.length && list.records.length > 0;

        if (allSelected) {
            // All records are currently selected, so deselect all
            list.records.forEach((record) => {
                record.toggleSelection(false);
            });
        } else {
            // Some or no records are selected, so select all
            list.records.forEach((record) => {
                record.toggleSelection(true);
            });
        }

        // Update our custom bulk state after a short delay
        // The delay ensures the record.selected properties are updated first
        if (this.props.onToggleSelectAll) {
            setTimeout(() => this.props.onToggleSelectAll(), 0);
        }
    }

    /**
     * Handle individual record checkbox toggle
     * This is called when the user clicks a checkbox in a table row
     * @param {Object} record - The record being toggled
     */
    toggleRecordSelection(record) {
        if (!this.canSelectRecord) {
            return;
        }

        // Toggle the record's selection state
        record.toggleSelection();

        // Update our custom bulk state after a short delay
        // The delay ensures the record.selected property is updated first
        if (this.props.onToggleSelect) {
            setTimeout(() => this.props.onToggleSelect(record.id), 0);
        }
    }

    /**
     * Override to control the "Select All" checkbox state
     * @returns {boolean} True if all records are selected, false otherwise
     */
    get selectAll() {
        if (this.props.bulkState) {
            return this.props.bulkState.selectAll;
        }
        return super.selectAll;
    }

    /**
     * Add custom CSS class to selected rows
     * @param {Object} record - The record to get the class for
     * @returns {string} CSS classes for the row
     */
    getRowClass(record) {
        let classes = super.getRowClass(record);
        if (this.props.bulkState && this.props.bulkState.selectedIds.has(record.id)) {
            classes += " table-active";
        }
        return classes;
    }
}

// Use the parent template directly - no need for custom template
BulkDeleteListRenderer.template = "web.ListRenderer";

// Define the props this component accepts
// The "?" suffix means the prop is optional
BulkDeleteListRenderer.props = [
    ...ListRenderer.props,  // Inherit all props from parent ListRenderer
    "bulkState?",           // Object containing selectedIds Set and selectAll boolean
    "onBulkDelete?",        // Function to call when delete button is clicked
    "onToggleSelect?",      // Function to call when a record checkbox is toggled
    "onToggleSelectAll?",   // Function to call when "Select All" checkbox is toggled
    "allowBulkDelete?",     // Boolean to control whether checkboxes are shown
];

/**
 * Custom One2Many Field with Bulk Delete functionality for Odoo 16
 *
 * This class extends the standard X2ManyField to add bulk delete capabilities.
 * It manages the selection state and provides delete functionality.
 */
export class One2ManyBulkDelete extends X2ManyField {
    /**
     * Setup the component
     * Initializes services and reactive state
     */
    setup() {
        super.setup();

        // Get Odoo services for notifications and dialogs
        this.notification = useService("notification");
        this.dialog = useService("dialog");

        // Create reactive state for tracking selected records
        // useState makes this reactive - when it changes, the UI updates automatically
        this.bulkState = useState({
            selectedIds: new Set(),  // Set of selected record IDs
            selectAll: false,        // Whether "Select All" checkbox is checked
        });
    }

    /**
     * Get props to pass to the renderer component
     * Adds our custom props to the standard renderer props
     * @returns {Object} Props object for the renderer
     */
    get rendererProps() {
        const props = super.rendererProps;

        // Check if bulk delete should be allowed based on parent record state
        const allowBulkDelete = this.isAllowedToDelete();

        // Add our custom props
        props.bulkState = this.bulkState;                           // Pass the reactive state
        props.onBulkDelete = this.onBulkDelete.bind(this);         // Delete button handler
        props.onToggleSelect = this.onToggleSelect.bind(this);     // Individual checkbox handler
        props.onToggleSelectAll = this.onToggleSelectAll.bind(this); // Select All handler
        props.allowBulkDelete = allowBulkDelete;                    // Whether to show checkboxes

        return props;
    }

    /**
     * Check if bulk delete is allowed based on parent record state
     * Override this method or customize the logic for your specific use case
     * @returns {boolean} True if bulk delete is allowed, false otherwise
     */
    isAllowedToDelete() {
        // Get the parent record
        const parentRecord = this.props.record;

        if (!parentRecord || !parentRecord.data) {
            return true; // Allow if no parent record
        }

        // Check if parent has a 'state' field
        if ('state' in parentRecord.data) {
            const state = parentRecord.data.state;

            // List of states where deletion is NOT allowed
            // Customize this list based on your requirements
            const restrictedStates = ['sale', 'purchase', 'done', 'cancel', 'posted'];

            // Return false if state is in restricted list
            if (restrictedStates.includes(state)) {
                return false;
            }
        }

        // Check for other common state fields
        // For invoices: check 'state' or 'payment_state'
        if ('payment_state' in parentRecord.data) {
            const paymentState = parentRecord.data.payment_state;
            if (['paid', 'in_payment', 'reversed'].includes(paymentState)) {
                return false;
            }
        }

        // Default: allow bulk delete
        return true;
    }

    /**
     * Determine which renderer component to use
     * Returns our custom renderer for list view, standard renderer for other views
     * @returns {Component} The renderer component class
     */
    get rendererComponent() {
        if (this.viewMode === 'list') {
            return BulkDeleteListRenderer;
        }
        return super.rendererComponent;
    }

    /**
     * Handle individual record checkbox toggle
     * Called when a user clicks a checkbox in a table row
     *
     * This method rebuilds the entire selectedIds Set based on the current
     * selection state of all records. This ensures we stay in sync with
     * the actual record.selected properties.
     *
     * @param {number} recordId - The ID of the record that was toggled
     */
    onToggleSelect(recordId) {
        const list = this.props.value;

        // Rebuild selectedIds Set from scratch based on current selection state
        // This is more reliable than trying to track individual changes
        this.bulkState.selectedIds.clear();
        list.records.forEach(r => {
            if (r.selected) {
                this.bulkState.selectedIds.add(r.id);
            }
        });

        // Update "Select All" checkbox state
        // It should be checked only if ALL records are selected
        const totalRecords = list.records.length;
        const selectedCount = this.bulkState.selectedIds.size;
        this.bulkState.selectAll = selectedCount === totalRecords && totalRecords > 0;
    }

    /**
     * Handle "Select All" checkbox toggle
     * Called when a user clicks the "Select All" checkbox in the table header
     *
     * This method rebuilds the selectedIds Set based on the current selection state.
     */
    onToggleSelectAll() {
        const list = this.props.value;

        // Rebuild selectedIds Set from scratch based on current selection state
        this.bulkState.selectedIds.clear();
        list.records.forEach(record => {
            if (record.selected) {
                this.bulkState.selectedIds.add(record.id);
            }
        });

        // Update "Select All" checkbox state
        const totalRecords = list.records.length;
        const selectedCount = this.bulkState.selectedIds.size;
        this.bulkState.selectAll = selectedCount === totalRecords && totalRecords > 0;
    }

    /**
     * Handle delete button click
     * Shows a confirmation dialog before deleting selected records
     */
    async onBulkDelete() {
        const selectedCount = this.bulkState.selectedIds.size;

        // Validate that at least one record is selected
        if (selectedCount === 0) {
            this.notification.add(
                "Please select at least one record to delete.",
                { type: "warning" }
            );
            return;
        }

        // Show confirmation dialog with proper singular/plural text
        const confirmMessage = selectedCount === 1
            ? `Are you sure you want to delete this record?`
            : `Are you sure you want to delete ${selectedCount} records?`;

        this.dialog.add(ConfirmationDialog, {
            body: confirmMessage,
            confirm: async () => {
                await this.deleteSelectedRecords();
            },
            cancel: () => {
                // User cancelled - do nothing
            },
        });
    }

    /**
     * Delete the selected records
     * Called after user confirms deletion in the dialog
     */
    async deleteSelectedRecords() {
        try {
            const list = this.props.value;
            const parentRecord = this.props.record;

            // Get the actual record objects to delete
            const recordsToDelete = list.records.filter(
                record => this.bulkState.selectedIds.has(record.id)
            );
            const deleteCount = recordsToDelete.length;

            if (deleteCount === 0) {
                this.notification.add(
                    "No records to delete.",
                    { type: "warning" }
                );
                return;
            }

            // Delete each record using the list's delete method
            // This properly handles the deletion through Odoo's relational model
            for (const record of recordsToDelete) {
                await list.delete(record.id, "DELETE");
            }

            // Save the parent record to persist the deletions to the database
            // This triggers Odoo's ORM to execute the unlink with all business logic
            if (parentRecord && parentRecord.model && parentRecord.model.root) {
                await parentRecord.model.root.save();
            }

            // Show success notification with proper singular/plural text
            const successMessage = deleteCount === 1
                ? `1 record deleted successfully.`
                : `${deleteCount} records deleted successfully.`;

            this.notification.add(
                successMessage,
                { type: "success" }
            );

            // Clear selection state
            this.bulkState.selectedIds.clear();
            this.bulkState.selectAll = false;

        } catch (error) {
            // Show error notification if deletion fails
            this.notification.add(
                `Error deleting records: ${error.message}`,
                { type: "danger" }
            );
            console.error("Bulk delete error:", error);
        }
    }
}

// Set the template for this component
One2ManyBulkDelete.template = "one2many_bulk_delete.X2ManyField";

// Define the components this component uses
One2ManyBulkDelete.components = {
    ...X2ManyField.components,           // Inherit all parent components
    ListRenderer: BulkDeleteListRenderer, // Use our custom list renderer
};

// Register this widget in Odoo's field registry
// This makes it available to use with widget="one2many_bulk_delete" in XML views
registry.category("fields").add("one2many_bulk_delete", One2ManyBulkDelete);