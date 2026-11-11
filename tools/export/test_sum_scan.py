"""Check SUM chunk boundaries and fast-decaying states against upstream Mamba."""

import torch

from export_sum import grouped_scan, reference_scan


def main():
    torch.set_num_threads(4)
    torch.manual_seed(0)
    reference = reference_scan()
    with torch.inference_mode():
        for length in (1, 9, 31, 32, 33, 64, 65, 129):
            for scale in (1., 100.):
                u, delta = torch.randn(2, 8, length), torch.randn(2, 8, length)
                A = -torch.rand(8, 3) * scale
                B, C = torch.randn(2, 4, 3, length), torch.randn(2, 4, 3, length)
                D, bias = torch.randn(8), torch.randn(8)
                expected = reference(u, delta, A, B, C, D, delta_bias=bias, delta_softplus=True)
                torch.testing.assert_close(grouped_scan(u, delta, A, B, C, D, bias), expected,
                                           rtol=1e-5, atol=1e-5)
    print("PASS SUM scan: 16 boundary/decay cases")


if __name__ == "__main__":
    main()
