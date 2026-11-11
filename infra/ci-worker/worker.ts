// Inert stub. The ui-ci project's value is its BUILD COMMAND (infra/ci-worker/build.sh), not this
// Worker: no routes, workers.dev off. Deploying it is only how a Workers Build reports success.
export default {
  fetch(): Response {
    return new Response("ui-ci: build stub", { status: 200 });
  },
};
