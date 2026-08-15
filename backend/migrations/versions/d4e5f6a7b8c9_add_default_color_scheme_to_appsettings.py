"""Add default_color_scheme to AppSettings

Revision ID: d4e5f6a7b8c9
Revises: c1a2b3d4e5f6
Create Date: 2026-08-15 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd4e5f6a7b8c9'
down_revision = 'c1a2b3d4e5f6'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('app_settings', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column('default_color_scheme', sa.String(length=10), nullable=False, server_default='dark')
        )


def downgrade():
    with op.batch_alter_table('app_settings', schema=None) as batch_op:
        batch_op.drop_column('default_color_scheme')
