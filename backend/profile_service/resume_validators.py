from abc import ABC, abstractmethod


class ResumeValidator(ABC):

    @abstractmethod
    def is_valid(self, filepath: str) -> bool:
        pass


class PDFValidator(ResumeValidator):

    SIGNATURE = b"%PDF"

    def is_valid(self, filepath):
        try:
            with open(filepath, "rb") as f:
                print("before header")
                header = f.read(len(self.SIGNATURE))
                print(header)
            return header == self.SIGNATURE
        except (OSError, IOError):
            return False


class DocxValidator(ResumeValidator):

    SIGNATURE = b"PK"

    def is_valid(self, filepath):
        try:
            with open(filepath, "rb") as f:
                header = f.read(len(self.SIGNATURE))
            return header == self.SIGNATURE
        except (OSError, IOError):
            return False


class DocValidator(ResumeValidator):
    SIGNATURE = b"\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1"

    def is_valid(self, filepath):
        try:
            with open(filepath, "rb") as f:
                header = f.read(len(self.SIGNATURE))
            return header == self.SIGNATURE
        except (OSError, IOError):
            return False


VALIDATORS = {
    "pdf": PDFValidator(),
    "docx": DocxValidator(),
    "doc": DocValidator(),
}


def get_validator(extension: str) -> ResumeValidator:
    return VALIDATORS.get(extension.lower())