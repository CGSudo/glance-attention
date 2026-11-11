# Research credits

Start with the license column before reusing an asset. These records describe planned Glance use, not a claim that models have shipped.

Glance contributors author Glance documentation and code. Research authors below identify credited third-party work. Code licenses do not automatically license papers, weights, training data or dependencies. Verify exact artifacts before redistribution; datasets are linked, never mirrored.

| Paper / model / dataset | Authors | Institution | Venue + year | Link | License | How Glance uses it |
|---|---|---|---|---|---|---|
| A Model of Saliency-Based Visual Attention for Rapid Scene Analysis | Laurent Itti; Christof Koch; Ernst Niebur | Caltech; additional affiliation TODO-verify | PAMI 1998 | [Paper / DOI](https://doi.org/10.1109/34.730558) | Paper/implementation terms TODO-verify | Conceptual saliency and inhibition-of-return background; no original assets bundled. |
| Learning to Predict Where Humans Look / MIT1003 | Tilke Judd; Krista Ehinger; Frédo Durand; Antonio Torralba | MIT; additional affiliation TODO-verify | ICCV 2009 | [Paper / DOI](https://doi.org/10.1109/ICCV.2009.5459462) | Paper and dataset terms TODO-verify; not mirrored | Historical saliency dataset and prediction reference; no dataset distribution. |
| What do different evaluation metrics tell us about saliency models? | Zoya Bylinskii; Tilke Judd; Aude Oliva; Antonio Torralba; Frédo Durand | MIT | PAMI 2019; arXiv 2016 | [Paper / DOI](https://arxiv.org/abs/1604.03605) | Paper reuse terms TODO-verify | Metric interpretation; AUC, CC and NSS explanations. |
| DeepGaze IIE: Calibrated prediction in and out-of-domain for state-of-the-art saliency modeling | Akis Linardos; Matthias Kümmerer; Ori Press; Matthias Bethge | University of Tübingen | ICCV 2021 | [Paper / DOI](https://arxiv.org/abs/2105.12441) | No model redistribution license established in SPEC; user-import only; paper terms TODO-verify | Reference benchmark values only; imported ONNX support subject to verification. |
| Predicting Visual Importance Across Graphic Design Types / UMSI / Imp1k | Camilo Fosco; Vincent Casser; Amish Kumar Bedi; Peter O’Donovan; Aaron Hertzmann; Zoya Bylinskii | MIT + Adobe; full affiliation mapping TODO-verify | UIST 2020 | [Paper / DOI](https://arxiv.org/abs/2008.02912) | Paper, code, weights and dataset terms TODO-verify | Design-domain importance background; not bundled or claimed as the SUM model. |
| UEyes: An Eye-Tracking Dataset across User Interface Types | Yue Jiang; Luis A. Leiva; Paul R. B. Houssel; Hamed R. Tavakoli; Julia Kylmälä; Antti Oulasvirta | Aalto University; full affiliations TODO-verify | CHI 2023 workshop; arXiv 2024 | [Paper / DOI](https://arxiv.org/abs/2402.05202) | Paper and dataset terms TODO-verify; not mirrored | UI-domain gaze dataset reference; workshop derivative distinguished from main research paper. |
| EyeFormer: Predicting Personalized Scanpaths with Transformer-Guided Reinforcement Learning | Yue Jiang; Zixin Guo; Hamed R. Tavakoli; Luis A. Leiva; Antti Oulasvirta | Aalto University; University of Luxembourg; Nokia Technologies | UIST 2024 | [Paper / DOI](https://doi.org/10.1145/3654777.3676436) | No model license established in SPEC; user-import only; paper terms TODO-verify | Optional UI scanpath import; excluded from redistributed assets. |
| SUM: Saliency Unification through Mamba for Visual Attention Modeling | Alireza Hosseini; Amirhossein Kazerouni; Saeed Akhavan; Michael Brudno; Babak Taati | University of Tehran; University of Toronto; Vector Institute; University Health Network | WACV 2025 | [Paper / DOI](https://arxiv.org/abs/2406.17815) | MIT code per SPEC; weights/dependencies and paper terms TODO-verify | Candidate image model. ONNX selective-scan export and parity pending; exclude from v1 if unsupported. |
| Unified Image and Video Saliency Modeling / UNISAL | Richard Droste; Jianbo Jiao; J. Alison Noble | University of Oxford | ECCV 2020 | [Paper / DOI](https://arxiv.org/abs/2003.05477) | Apache-2.0 code per SPEC; weights/dependencies and paper terms TODO-verify | Candidate image/video model; ONNX export and parity pending. |
| TranSalNet: Towards perceptually relevant visual saliency prediction | Lou et al.; full author list TODO-verify | Cardiff University; full affiliations TODO-verify | Neurocomputing 2022 | [Paper / DOI](https://doi.org/10.1016/j.neucom.2022.04.080) | MIT code per SPEC; weights/dependencies and paper terms TODO-verify | Candidate image model; ONNX export and parity pending. |
| CAT2000: A Large Scale Fixation Dataset for Boosting Saliency Research | Ali Borji; Laurent Itti | University of Southern California; affiliation mapping TODO-verify | arXiv 2015 | [Paper / DOI](https://arxiv.org/abs/1505.03581) | Paper and dataset terms TODO-verify; not mirrored | Benchmark context; dataset linked, never redistributed. |
| MIT/Tübingen Saliency Benchmark / MIT300 | Benchmark contributors; full author attribution TODO-verify | MIT + University of Tübingen | Benchmark website; year TODO-verify | [Paper / DOI](https://saliency.tuebingen.ai/) | Website/data terms TODO-verify; not mirrored | Source for supplied DeepGaze IIE and human reference values. Exact leaderboard row/protocol pending. |
| Saliency Benchmarking Made Easy: Separating Models, Maps and Metrics | Matthias Kümmerer; Thomas S. A. Wallis; Matthias Bethge | University of Tübingen; full affiliations TODO-verify | ECCV 2018 | [Paper / DOI](https://doi.org/10.1007/978-3-030-01270-0_47) | Paper terms TODO-verify | Benchmark protocol background; model density and metric-specific maps differ. |

## Model registry sources

| Model | Primary implementation | Distribution policy |
|---|---|---|
| SUM | https://github.com/Arhosseini77/SUM | MIT code per SPEC. TODO-verify weight/dependency rights and export readiness. |
| TranSalNet | https://github.com/LJOVO/TranSalNet | MIT code. TODO-verify weight/dependency rights and export parity. |
| UNISAL | https://github.com/rdroste/unisal | Apache-2.0 code per SPEC. TODO-verify weight/dependency rights and export parity. |
| EyeFormer | https://github.com/YueJiang-nj/EyeFormer-UIST2024 | SPEC establishes no redistribution license; user-import only pending permission. |
| DeepGaze IIE | https://arxiv.org/abs/2105.12441 | Reference only / user-import only under SPEC policy; no bundled assets. |

SUM export status: not tested in this documentation task. Do not claim a working ONNX package. If Mamba selective-scan cannot export and pass parity, exclude SUM from v1 and replace this note with the actual failure and reason.

UEyes source nuance: arXiv:2402.05202 calls itself a CHI 2023 workshop derivative. Do not label that link as the full main-conference article without verifying its separate citation.

Benchmark values supplied for this task: DeepGaze IIE AUC 0.8829, CC 0.8242, NSS 2.5265; human gold standard AUC 0.9341, CC 0.9828. TODO-verify the exact row, dataset and evaluation variant before publication. No Glance or ONNX benchmark is established.

## BibTeX

Records with TODO-verify are intentionally incomplete. Verify those fields before using them in a publication. arXiv submission years can differ from venue years.

```bibtex
@misc{itti1998,
  title = {A Model of Saliency-Based Visual Attention for Rapid Scene Analysis},
  author = {Laurent Itti and Christof Koch and Ernst Niebur},
  howpublished = {PAMI 1998},
  url = {https://doi.org/10.1109/34.730558},
  note = {Affiliations: Caltech; additional affiliation TODO-verify. License: Paper/implementation terms TODO-verify}
}

@misc{judd2009,
  title = {Learning to Predict Where Humans Look / MIT1003},
  author = {Tilke Judd and Krista Ehinger and Frédo Durand and Antonio Torralba},
  howpublished = {ICCV 2009},
  url = {https://doi.org/10.1109/ICCV.2009.5459462},
  note = {Affiliations: MIT; additional affiliation TODO-verify. License: Paper and dataset terms TODO-verify; not mirrored}
}

@misc{bylinskii2019,
  title = {What do different evaluation metrics tell us about saliency models?},
  author = {Zoya Bylinskii and Tilke Judd and Aude Oliva and Antonio Torralba and Frédo Durand},
  howpublished = {PAMI 2019; arXiv 2016},
  url = {https://arxiv.org/abs/1604.03605},
  note = {Affiliations: MIT. License: Paper reuse terms TODO-verify}
}

@misc{linardos2021,
  title = {DeepGaze IIE: Calibrated prediction in and out-of-domain for state-of-the-art saliency modeling},
  author = {Akis Linardos and Matthias Kümmerer and Ori Press and Matthias Bethge},
  howpublished = {ICCV 2021},
  url = {https://arxiv.org/abs/2105.12441},
  note = {Affiliations: University of Tübingen. License: No model redistribution license established in SPEC; user-import only; paper terms TODO-verify}
}

@misc{fosco2020,
  title = {Predicting Visual Importance Across Graphic Design Types / UMSI / Imp1k},
  author = {Camilo Fosco and Vincent Casser and Amish Kumar Bedi and Peter O’Donovan and Aaron Hertzmann and Zoya Bylinskii},
  howpublished = {UIST 2020},
  url = {https://arxiv.org/abs/2008.02912},
  note = {Affiliations: MIT + Adobe; full affiliation mapping TODO-verify. License: Paper, code, weights and dataset terms TODO-verify}
}

@misc{jiang2023ueyes,
  title = {UEyes: An Eye-Tracking Dataset across User Interface Types},
  author = {Yue Jiang and Luis A. Leiva and Paul R. B. Houssel and Hamed R. Tavakoli and Julia Kylmälä and Antti Oulasvirta},
  howpublished = {CHI 2023 workshop; arXiv 2024},
  url = {https://arxiv.org/abs/2402.05202},
  note = {Affiliations: Aalto University; full affiliations TODO-verify. License: Paper and dataset terms TODO-verify; not mirrored}
}

@misc{jiang2024eyeformer,
  title = {EyeFormer: Predicting Personalized Scanpaths with Transformer-Guided Reinforcement Learning},
  author = {Yue Jiang and Zixin Guo and Hamed R. Tavakoli and Luis A. Leiva and Antti Oulasvirta},
  howpublished = {UIST 2024},
  url = {https://doi.org/10.1145/3654777.3676436},
  note = {Affiliations: Aalto University; University of Luxembourg; Nokia Technologies. License: No model license established in SPEC; user-import only; paper terms TODO-verify}
}

@misc{hosseini2025sum,
  title = {SUM: Saliency Unification through Mamba for Visual Attention Modeling},
  author = {Alireza Hosseini and Amirhossein Kazerouni and Saeed Akhavan and Michael Brudno and Babak Taati},
  howpublished = {WACV 2025},
  url = {https://arxiv.org/abs/2406.17815},
  note = {Affiliations: University of Tehran; University of Toronto; Vector Institute; University Health Network. License: MIT code per SPEC; weights/dependencies and paper terms TODO-verify}
}

@misc{droste2020unisal,
  title = {Unified Image and Video Saliency Modeling / UNISAL},
  author = {Richard Droste and Jianbo Jiao and J. Alison Noble},
  howpublished = {ECCV 2020},
  url = {https://arxiv.org/abs/2003.05477},
  note = {Affiliations: University of Oxford. License: Apache-2.0 code per SPEC; weights/dependencies and paper terms TODO-verify}
}

@misc{lou2022transalnet,
  title = {TranSalNet: Towards perceptually relevant visual saliency prediction},
  author = {Lou et al. and full author list TODO-verify},
  howpublished = {Neurocomputing 2022},
  url = {https://doi.org/10.1016/j.neucom.2022.04.080},
  note = {Affiliations: Cardiff University; full affiliations TODO-verify. License: MIT code per SPEC; weights/dependencies and paper terms TODO-verify}
}

@misc{borji2015cat2000,
  title = {CAT2000: A Large Scale Fixation Dataset for Boosting Saliency Research},
  author = {Ali Borji and Laurent Itti},
  howpublished = {arXiv 2015},
  url = {https://arxiv.org/abs/1505.03581},
  note = {Affiliations: University of Southern California; affiliation mapping TODO-verify. License: Paper and dataset terms TODO-verify; not mirrored}
}

@misc{mitTuebingenBenchmark,
  title = {MIT/Tübingen Saliency Benchmark / MIT300},
  author = {Benchmark contributors and full author attribution TODO-verify},
  howpublished = {Benchmark website; year TODO-verify},
  url = {https://saliency.tuebingen.ai/},
  note = {Affiliations: MIT + University of Tübingen. License: Website/data terms TODO-verify; not mirrored}
}

@misc{kummerer2018,
  title = {Saliency Benchmarking Made Easy: Separating Models, Maps and Metrics},
  author = {Matthias Kümmerer and Thomas S. A. Wallis and Matthias Bethge},
  howpublished = {ECCV 2018},
  url = {https://doi.org/10.1007/978-3-030-01270-0_47},
  note = {Affiliations: University of Tübingen; full affiliations TODO-verify. License: Paper terms TODO-verify}
}

```
