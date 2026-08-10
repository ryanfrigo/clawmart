import unittest

from harness import protocol
from harness.tools import REGISTRY


def parse(text):
    return protocol.parse(text, REGISTRY)


class Parsing(unittest.TestCase):
    def test_plain_object(self):
        call, err = parse('{"thought":"look","tool":"read_file","args":{"path":"a.ts"}}')
        self.assertEqual(err, "")
        self.assertEqual(call.tool, "read_file")
        self.assertEqual(call.args["path"], "a.ts")
        self.assertEqual(call.args["start_line"], 1)  # default applied

    def test_prose_preamble_and_fences(self):
        call, err = parse(
            'Sure! Here is my plan {not json}.\n```json\n'
            '{"tool":"list_files","args":{"prefix":"src/"}}\n```\nLet me know.'
        )
        self.assertEqual(err, "")
        self.assertEqual(call.tool, "list_files")
        self.assertEqual(call.args["prefix"], "src/")

    def test_two_objects_takes_the_last(self):
        call, _ = parse('{"tool":"list_files","args":{}} then {"tool":"diff","args":{}}')
        self.assertEqual(call.tool, "diff")

    def test_braces_inside_strings_do_not_confuse_the_scanner(self):
        call, err = parse('{"tool":"write_file","args":{"path":"a.js","content":"function f(){}"}}')
        self.assertEqual(err, "")
        self.assertEqual(call.args["content"], "function f(){}")

    def test_failures_are_errors_not_exceptions(self):
        for text in ("", "   ", "no json here", "{", '{"tool":"read_file"',
                     '{"tool":"bash","args":{"cmd":"rm -rf /"}}',
                     '{"tool":"read_file","args":{"path":"a","sudo":true}}',
                     '{"tool":"read_file","args":{"path":123}}',
                     '{"tool":"read_file","args":[]}',
                     '{"tool":"edit_file","args":{"path":"a"}}',
                     '["not","an","object"]'):
            call, err = parse(text)
            self.assertIsNone(call, text)
            self.assertTrue(err, text)

    def test_there_is_no_shell_tool(self):
        for name in ("bash", "sh", "exec", "run", "shell", "git", "curl", "fetch_url"):
            self.assertNotIn(name, REGISTRY)

    def test_bool_is_not_an_int(self):
        call, err = parse('{"tool":"list_files","args":{"limit":true}}')
        self.assertIsNone(call)
        self.assertIn("integer", err)

    def test_digest_is_stable_for_stall_detection(self):
        a, _ = parse('{"tool":"list_files","args":{"prefix":"src/","limit":10}}')
        b, _ = parse('{"tool":"list_files","args":{"limit":10,"prefix":"src/"}}')
        self.assertEqual(a.digest(), b.digest())

    def test_thought_is_truncated(self):
        call, _ = parse('{"thought":"%s","tool":"diff","args":{}}' % ("x" * 500))
        self.assertLessEqual(len(call.thought), protocol.MAX_THOUGHT)

    def test_repair_names_the_error_and_the_tools(self):
        text = protocol.repair("invalid JSON: boom", REGISTRY)
        self.assertIn("invalid JSON: boom", text)
        self.assertIn("read_file", text)

    def test_system_prompt_carries_the_nonce_and_the_trust_rules(self):
        prompt = protocol.system_prompt("an engineer", "spec", "gate", "abc123")
        self.assertIn("<<<UNTRUSTED_abc123>>>", prompt)
        self.assertIn("Never invent statistics", prompt)
        self.assertIn("Done is earned", prompt)


if __name__ == "__main__":
    unittest.main()
