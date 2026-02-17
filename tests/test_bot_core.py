import importlib.util
import sqlite3
import tempfile
from pathlib import Path

MODULE_PATH = Path(__file__).resolve().parents[1] / "TG Bot VED" / "bot_with_check_updated.py"
spec = importlib.util.spec_from_file_location("bot_module", MODULE_PATH)
bot_module = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(bot_module)


def test_assess_expert_input_min_requirements():
    assert bot_module.assess_expert_input("Компрессорный холодильник 300 л, температура -18°C")
    assert not bot_module.assess_expert_input("холодильник")


def test_classify_text_with_db_found_and_missing():
    with tempfile.TemporaryDirectory() as td:
        db = Path(td) / "test.db"
        conn = sqlite3.connect(db)
        try:
            bot_module.init_db(str(db))
            cur = conn.cursor()
            cur.execute("INSERT INTO tnved(code, title) VALUES (?, ?)", ("8408101100", "Тестовый код"))
            conn.commit()
        finally:
            conn.close()

        found = bot_module.classify_text_with_db(str(db), "8408101100")
        assert found[0].code == "8408101100"
        assert found[0].confidence >= 0.9

        missing = bot_module.classify_text_with_db(str(db), "9999999999")
        assert missing[0].code == "9999999999"
        assert missing[0].confidence == 0.35


def test_user_mode_persistence_helpers():
    with tempfile.TemporaryDirectory() as td:
        db = Path(td) / "test.db"
        bot_module.init_db(str(db))
        bot_module.ensure_user(str(db), 123, "tester")

        assert bot_module.get_user_mode(str(db), 123) == "expert"

        bot_module.set_user_mode(str(db), 123, "light")
        assert bot_module.get_user_mode(str(db), 123) == "light"
