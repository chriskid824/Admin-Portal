const navBar = {
  items: {
    orders: {
      path: "/order",
      title: "Orders",
      items: {
        search: {
          path: "/search",
          title: "Order View",
          isHidden: true
        }
      }
    },
    buyers: {
      path: "/customer",
      title: "Buyers"
    },
    sellers: {
      path: "#",
      title: "Sellers"
    },
    logistics: {
      path: "/shipping/",
      title: "Logistics"
    },
    product: {
      path: "/product",
      title: "Products"
    }
  }
};

let items = {};
Object.keys(navBar.items).forEach((i) => {
  const item = Object.assign({}, navBar.items[i]);
  const subitems = Object.assign({}, item.items);
  items[i] = Object.assign({}, item, {
    items: subitems,
    hasChildren: subitems &&
      !!(Object.keys(subitems).find((j) => !subitems[j].isHidden))
  });
});

export default {
  items
};
