import unittest

from harness import llm
from harness.budget import Budget


class DollarCap(unittest.TestCase):
    def setUp(self):
        self.slept = []
        real_sleep = llm.time.sleep
        llm.time.sleep = self.slept.append
        self.addCleanup(setattr, llm.time, "sleep", real_sleep)

    def client(self, budget, models=("m1", "m2")):
        return llm.Client("k", list(models), budget)

    def test_the_cap_holds_INSIDE_one_call_not_only_between_iterations(self):
        # One call fans out to (retries + 1) x len(models) PAID upstream calls.
        # Checking the budget only between iterations let a single turn overshoot
        # by that whole factor.
        bud = Budget(usd=0.02, max_iterations=10, seconds=600, now=0.0)
        client = self.client(bud)
        calls = []

        def fake_post(model, messages, timeout):
            calls.append(model)
            return {"choices": [{"message": {"content": ""}}], "usage": {"cost": 0.05}}

        client._post = fake_post
        with self.assertRaises(llm.OutOfMoney):
            client.call([{"role": "user", "content": "hi"}])
        self.assertEqual(calls, ["m1"])  # was 6: 3 attempts x 2 models

    def test_a_run_with_budget_left_still_retries_and_advances_the_chain(self):
        bud = Budget(usd=100.0, max_iterations=10, seconds=600, now=0.0)
        client = self.client(bud)
        calls = []

        def fake_post(model, messages, timeout):
            calls.append(model)
            if model == "m1":
                raise OSError("upstream down")
            return {"choices": [{"message": {"content": "hello"}}], "usage": {"cost": 0.001}}

        client._post = fake_post
        self.assertEqual(client.call([{"role": "user", "content": "hi"}]), "hello")
        self.assertEqual(calls, ["m1", "m1", "m1", "m2"])
        self.assertEqual(client.model, "m2")


if __name__ == "__main__":
    unittest.main()
