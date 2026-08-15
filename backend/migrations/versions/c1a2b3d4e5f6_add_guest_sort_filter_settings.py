"""Add guest sort/filter settings to User

Revision ID: c1a2b3d4e5f6
Revises: b7e21f4c9a03
Create Date: 2026-08-15 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c1a2b3d4e5f6'
down_revision = 'b7e21f4c9a03'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column('guest_sort_by_price_enabled', sa.Boolean(), nullable=False, server_default=sa.false())
        )
        batch_op.add_column(
            sa.Column('guest_filter_by_label_enabled', sa.Boolean(), nullable=False, server_default=sa.false())
        )
        batch_op.add_column(
            sa.Column('guest_filter_by_brand_enabled', sa.Boolean(), nullable=False, server_default=sa.false())
        )


def downgrade():
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.drop_column('guest_filter_by_brand_enabled')
        batch_op.drop_column('guest_filter_by_label_enabled')
        batch_op.drop_column('guest_sort_by_price_enabled')
