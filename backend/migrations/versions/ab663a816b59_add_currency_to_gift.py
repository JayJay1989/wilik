"""Add currency to Gift

Revision ID: ab663a816b59
Revises: 994f86e80a0e
Create Date: 2026-07-26 20:35:52.022242

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'ab663a816b59'
down_revision = '994f86e80a0e'
branch_labels = None
depends_on = None


def upgrade():
    # Only the genuine change -- autogenerate also flagged the gift->user foreign
    # key and the user table's unique constraints as changed, but those are just
    # SQLite reflection noise (unnamed constraints), not real model changes.
    with op.batch_alter_table('gift', schema=None) as batch_op:
        batch_op.add_column(sa.Column('currency', sa.String(length=4), nullable=True))


def downgrade():
    with op.batch_alter_table('gift', schema=None) as batch_op:
        batch_op.drop_column('currency')
