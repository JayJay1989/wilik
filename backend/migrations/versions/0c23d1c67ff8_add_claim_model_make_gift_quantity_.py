"""Add Claim model, make Gift.quantity nullable

Revision ID: 0c23d1c67ff8
Revises: ab663a816b59
Create Date: 2026-07-26 22:12:46.435786

"""
import secrets

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0c23d1c67ff8'
down_revision = 'ab663a816b59'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'claim',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('gift_id', sa.Integer(), nullable=False),
        sa.Column('claimed_by', sa.String(length=100), nullable=False),
        sa.Column('claim_token', sa.String(length=64), nullable=False),
        sa.Column('purchased', sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(['gift_id'], ['gift.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('claim_token'),
    )

    # Data migration: copy each gift's existing single claim (if any) into a Claim row
    # BEFORE the old columns are dropped below, so no live claim is lost.
    connection = op.get_bind()
    gift = sa.table(
        'gift',
        sa.column('id', sa.Integer),
        sa.column('claimed_by', sa.String),
        sa.column('claim_token', sa.String),
        sa.column('purchased', sa.Boolean),
    )
    claim = sa.table(
        'claim',
        sa.column('gift_id', sa.Integer),
        sa.column('claimed_by', sa.String),
        sa.column('claim_token', sa.String),
        sa.column('purchased', sa.Boolean),
    )
    claimed_rows = connection.execute(
        sa.select(gift.c.id, gift.c.claimed_by, gift.c.claim_token, gift.c.purchased)
        .where(gift.c.claimed_by.isnot(None))
    ).fetchall()
    for row in claimed_rows:
        connection.execute(
            claim.insert().values(
                gift_id=row.id,
                claimed_by=row.claimed_by,
                # defensive: a hand-edited dev row could theoretically have claimed_by
                # set but claim_token null; give it a fresh token rather than fail the migration
                claim_token=row.claim_token or secrets.token_urlsafe(24),
                purchased=bool(row.purchased),
            )
        )

    with op.batch_alter_table('gift', schema=None) as batch_op:
        batch_op.drop_column('claimed_by')
        batch_op.drop_column('claim_token')
        batch_op.drop_column('purchased')
        batch_op.alter_column('quantity', existing_type=sa.Integer(), nullable=True)


def downgrade():
    # Best-effort and lossy: if a gift ever had more than one claim, only the
    # lowest-id claim survives the trip back onto the singular gift columns; any
    # gift using infinite (null) quantity reverts to quantity=1. There is no way
    # to fully restore the pre-migration shape from a fanned-out claim history.
    with op.batch_alter_table('gift', schema=None) as batch_op:
        batch_op.add_column(sa.Column('claimed_by', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('claim_token', sa.String(length=64), nullable=True))
        batch_op.add_column(sa.Column('purchased', sa.Boolean(), nullable=False, server_default=sa.false()))

    connection = op.get_bind()
    gift = sa.table(
        'gift',
        sa.column('id', sa.Integer),
        sa.column('claimed_by', sa.String),
        sa.column('claim_token', sa.String),
        sa.column('purchased', sa.Boolean),
        sa.column('quantity', sa.Integer),
    )
    claim = sa.table(
        'claim',
        sa.column('id', sa.Integer),
        sa.column('gift_id', sa.Integer),
        sa.column('claimed_by', sa.String),
        sa.column('claim_token', sa.String),
        sa.column('purchased', sa.Boolean),
    )

    first_claim_per_gift = {}
    rows = connection.execute(
        sa.select(claim.c.gift_id, claim.c.claimed_by, claim.c.claim_token, claim.c.purchased)
        .order_by(claim.c.id)
    )
    for row in rows:
        first_claim_per_gift.setdefault(row.gift_id, row)

    for gift_id, row in first_claim_per_gift.items():
        connection.execute(
            gift.update().where(gift.c.id == gift_id).values(
                claimed_by=row.claimed_by, claim_token=row.claim_token, purchased=bool(row.purchased)
            )
        )

    connection.execute(gift.update().where(gift.c.quantity.is_(None)).values(quantity=1))

    with op.batch_alter_table('gift', schema=None) as batch_op:
        batch_op.alter_column('quantity', existing_type=sa.Integer(), nullable=False)

    op.drop_table('claim')
