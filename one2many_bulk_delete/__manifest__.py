{
    'name': 'One2Many Bulk Delete',
    'version': '16.0.1.0.0',
    'category': 'Extra Tools',
    'summary': 'Add bulk delete functionality to One2Many fields',
    'description': """
        One2Many Bulk Delete
        This module adds bulk delete functionality to One2Many fields in Odoo.
        Compatible with Odoo 16.0, 17.0, and 18.0
        Features:
        * Select multiple records in One2Many fields with checkboxes
        * Select All / Deselect All functionality
        * Delete selected records with one click
        * Confirmation dialog to prevent accidental deletions
        * State-based access control (auto-hide in restricted states)
        * Works with all One2Many fields in list view
        * Real-time selection count updates
    """,
    'author': 'MD. MEHEDI HASAN REAL',
    'website': 'https://www.linkedin.com/in/mehedihasanreal/',
    'price': 10.0,
    'currency': 'USD',
    'license': 'LGPL-3',
    'depends': ['web', 'sale', 'purchase'],
    'data': [
        'views/add_widget.xml'
    ],
    'assets': {
        'web.assets_backend': [
            'one2many_bulk_delete/static/src/js/one2many_bulk_delete.js',
            'one2many_bulk_delete/static/src/xml/one2many_bulk_delete.xml',
        ],
    },
    'images': ['static/src/img/demo.gif'],
    'installable': True,
    'application': False,
    'auto_install': False,
}

