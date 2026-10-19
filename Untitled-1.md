tanstack/react-query i have this in my package.json file. I want to use it in my project. Can you provide an example of how to use it in a React component?Certainly! `tanstack/react-query` is a powerful library for fetching, caching, and updating data  for example i dont want this type of things to exist on my project anymore const token = sessionStorage.getItem("pulselab_token");

  const res = await fetch(`${API_URL}/api/admin/overview`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  }); 


  audit the project and fix where it needed