version=$(date +%Y.%m.%d)
for b in boschdoc publication work-environment; do
  tag="registry.diginfra.net/hi/elab4-$b-frontend:$version"
  echo "> pushing $tag ..."
  docker push $tag
  echo
done
echo "done!"