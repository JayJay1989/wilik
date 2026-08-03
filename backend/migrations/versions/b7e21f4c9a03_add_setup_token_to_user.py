"""Add setup_token and allow_passwordless_setup to User for account setup/reset

Revision ID: b7e21f4c9a03
Revises: a5b31fa51480
Create Date: 2026-08-04 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b7e21f4c9a03'
down_revision = 'a5b31fa51480'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.add_column(sa.Column('setup_token', sa.String(length=64), nullable=True))
        batch_op.add_column(sa.Column('setup_token_expires_at', sa.DateTime(), nullable=True))
        batch_op.add_column(
            sa.Column('allow_passwordless_setup', sa.Boolean(), nullable=False, server_default=sa.false())
        )
        batch_op.create_unique_constraint('uq_user_setup_token', ['setup_token'])

    # Data migration: the old flow let anyone log in as an account with no password (or
    # one pending a forced reset) just by knowing its username. That's now opt-in via
    # allow_passwordless_setup instead of unconditional -- flip it on for every account
    # already in that state, so nothing changes for them and nobody gets locked out.
    connection = op.get_bind()
    user = sa.table(
        'user',
        sa.column('id', sa.Integer),
        sa.column('password_hash', sa.String),
        sa.column('must_change_password', sa.Boolean),
        sa.column('allow_passwordless_setup', sa.Boolean),
    )
    connection.execute(
        user.update()
        .where(sa.or_(user.c.password_hash.is_(None), user.c.must_change_password.is_(True)))
        .values(allow_passwordless_setup=True)
    )


def downgrade():
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.drop_constraint('uq_user_setup_token', type_='unique')
        batch_op.drop_column('allow_passwordless_setup')
        batch_op.drop_column('setup_token_expires_at')
        batch_op.drop_column('setup_token')
