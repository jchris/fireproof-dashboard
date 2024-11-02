import React from "react";
import { redirect } from "react-router-dom";

export async function loader({ request }) {
  const url = new URL(request.url);
  console.log(url);
  const state = url.searchParams.get("state");
  console.log(state);
  if (state) {
    const nextURL = JSON.parse(state).next_url;
    if (nextURL) {
      return redirect(nextURL);
    }
  }

  return redirect(`/fp/databases`);
}

export default function Index() {
  return <></>;
}
