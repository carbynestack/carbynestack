# Carbyne Stack Enhancement Proposals

A Carbyne Stack Enhancement Proposal (CSEP) is a way to propose, communicate and
coordinate on new efforts for the Carbyne Stack project. The CSEP process is
intended to provide a consistent and controlled path for changes to Carbyne
Stack (such as new features) so that all stakeholders can be confident about the
direction of the project.

## The CSEP Process

1. Promote an idea within the community, in particular onboard the maintainers,
   by pitching at the Carbyne Stack [community meeting][community-meeting]. **Do
   this early** to avoid any waste of effort in case your idea is rejected and
   to make sure that you give all stakeholders a chance to comment on and
   possibly join the effort. No need to have a proposal with all bells and
   whistles attached at this stage.
1. In case your proposal is well received, fill in the
   [CSEP template](NNNN-CSEP-template.md) with all the required information and
   create an issue to track the implementation of the proposal. Note that the
   issue will go through the regular triage process and gets assigned a
   priority. CSEPs should be developed in the public whenever possible as a
   shared document in this folder. The name of the file should follow the
   pattern `NNNN-short-title.md` where `NNNN` is the zero prefixed issue number
   used to track the implementation of the CSEP from above.

## Credits

The CSEP process is heavily inspired by [IETF RFCs][ietf-rfc],
[Kubernetes KEPs][k8s-keps] and [Rust RFCs][rust-rfcs].

[community-meeting]: https://carbynestack.io/community/participate/#community-meetings
[ietf-rfc]: https://www.ietf.org/standards/rfcs/
[k8s-keps]: https://github.com/kubernetes/enhancements/blob/master/keps/README.md
[rust-rfcs]: https://github.com/rust-lang/rfcs
