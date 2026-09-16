from sqlmodel import Field, SQLModel


class ReponsePossibleWrite(SQLModel):
    texte: str = Field(min_length=1, max_length=1000)
    est_correcte: bool
    ordre: int = Field(ge=1)


class ReponsesQuestionUpdate(SQLModel):
    reponses: list[ReponsePossibleWrite]