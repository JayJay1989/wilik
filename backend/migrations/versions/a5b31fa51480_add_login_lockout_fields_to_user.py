"""Add login lockout fields to User

Revision ID: a5b31fa51480
Revises: f811a9006e34
Create Date: 2026-08-02 09:10:02.387972

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a5b31fa51480'
down_revision = 'f811a9006e34'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column('failed_login_attempts', sa.Integer(), nullable=False, server_default='0')
        )
        batch_op.add_column(sa.Column('locked_until', sa.DateTime(), nullable=True))


def downgrade():
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.drop_column('locked_until')
        batch_op.drop_column('failed_login_attempts')
