# Unit tests for the box harness. They run as a Docker build gate
# (`python3 -m unittest discover -s tests -t .`), so the image cannot exist
# unless the confinement, pinning, parsing, budget, scrub, and push-gate rules
# all hold.
