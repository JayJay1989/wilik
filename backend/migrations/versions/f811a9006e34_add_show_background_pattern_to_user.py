"""Add show_background_pattern to User

Revision ID: f811a9006e34
Revises: 0c23d1c67ff8
Create Date: 2026-07-27 00:47:57.874807

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f811a9006e34'
down_revision = '0c23d1c67ff8'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column('show_background_pattern', sa.Boolean(), nullable=False, server_default=sa.true())
        )


def downgrade():
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.drop_column('show_background_pattern')
