<script>
  import UnorTreeItem from './UnorTreeItem.svelte';

  let { 
    item, 
    onEdit, 
    onDelete, 
    onAddChild, 
    loadChildren, 
    selectedId = null, 
    onSelect = null, 
    expandedKeys = $bindable() 
  } = $props();

  let loadingChildren = $state(false);

  let key = $derived(`${item.level}-${item.id}`);
  let isExpanded = $derived(
    item.expanded === true || (expandedKeys && expandedKeys.has(key))
  );
  let isSelected = $derived(selectedId !== null && String(selectedId) === String(item.id));

  async function toggle(e) {
    if (e) e.stopPropagation();
    
    if (onSelect) onSelect(item);

    if (item.hasChildren) {
      const willExpand = !isExpanded;
      if (willExpand && (!item.children || item.children.length === 0)) {
        loadingChildren = true;
        await loadChildren(item.id, item.level);
        loadingChildren = false;
      }
      if (expandedKeys) {
        if (willExpand) {
          expandedKeys.add(key);
        } else {
          expandedKeys.delete(key);
        }
        expandedKeys = new Set(expandedKeys);
      } else {
        item.expanded = willExpand;
      }
    }
  }
</script>

<div class="select-none">
  <div class="flex items-center group hover:bg-zinc-50 dark:hover:bg-zinc-800/30 rounded-xl transition-colors {isSelected ? 'bg-indigo-50/70 dark:bg-indigo-950/40 ring-1 ring-indigo-500/20' : ''}">
    <!-- Row Content (Clickable) -->
    <button 
      type="button"
      class="flex-1 flex items-center p-2.5 text-left border-none bg-transparent cursor-pointer rounded-xl transition-all"
      onclick={toggle}
      aria-expanded={isExpanded}
    >
      <!-- Expander Icon -->
      <div class="w-6 flex items-center justify-center shrink-0">
        {#if loadingChildren}
          <span class="animate-spin h-3.5 w-3.5 border-2 border-indigo-500 border-t-transparent rounded-full"></span>
        {:else if item.hasChildren}
          <svg 
            class="w-4 h-4 text-zinc-400 transition-transform duration-200 {isExpanded ? 'rotate-90 text-indigo-500' : ''}" 
            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        {/if}
      </div>

      <!-- Icon based on Level -->
      <div class="mr-3 shrink-0 {isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-indigo-500 dark:text-indigo-400'}">
        {#if item.level === 'instansi'}
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M3 7v1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7H3l2-4h14l2 4"/><path d="M5 21V10.85"/><path d="M19 21V10.85"/><path d="M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4"/></svg>
        {:else if item.level === 'induk'}
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/><path d="M2 10h20"/></svg>
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        {/if}
      </div>

      <!-- Info -->
      <div class="flex flex-col min-w-0 flex-1 pr-2 py-0.5">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-sm {isSelected ? 'text-indigo-700 dark:text-indigo-300 font-bold' : 'font-semibold text-zinc-900 dark:text-zinc-100'} truncate">
            {item.nmUnor || item.instansi || 'Unit Tanpa Nama'}
          </span>
          {#if item.isAktif === 0 || item.isAktif === false || item.isAktif === '0'}
            <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
              NON AKTIF
            </span>
          {/if}
          {#if isSelected}
            <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              TERPILIH
            </span>
          {/if}
        </div>

        {#if (item.nm_jab && item.nm_jab !== '-') || item.jenjang_jab}
          <div class="flex items-center gap-1.5 flex-wrap mt-0.5">
            {#if item.nm_jab && item.nm_jab !== '-'}
              <span class="text-[10px] sm:text-[11px] font-normal uppercase tracking-wider {isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-500 dark:text-zinc-400'} truncate">
                {item.nm_jab}
              </span>
            {/if}
            {#if item.jenjang_jab}
              <span class="px-1.5 py-0.2 rounded text-[10px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60 uppercase">
                {item.jenjang_jab}
              </span>
            {/if}
          </div>
        {/if}
      </div>
      
      <div class="ml-auto flex items-center gap-2 shrink-0">
        {#if item.level === 'instansi'}
          <span class="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Instansi</span>
        {:else if item.level === 'induk'}
          <span class="text-[10px] text-indigo-400 uppercase tracking-widest font-bold">Unor Induk</span>
        {/if}
      </div>
    </button>

    <!-- Actions (Visible on hover or when selected) -->
    <div class="{isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} flex items-center gap-1.5 pr-2 transition-opacity shrink-0">
      {#if item.level !== 'sub-sub'}
        <button 
          class="p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-zinc-800 rounded-lg transition-all"
          onclick={(e) => { e.stopPropagation(); onAddChild(item); }}
          title="Tambah Cabang"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      {/if}
      
      {#if item.level !== 'instansi'}
        <button 
          class="p-1.5 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-zinc-800 rounded-lg transition-all"
          onclick={(e) => { e.stopPropagation(); onEdit(item); }}
          title="Edit"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
        </button>
        <button 
          class="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-zinc-800 rounded-lg transition-all"
          onclick={(e) => { e.stopPropagation(); onDelete(item); }}
          title="Hapus"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      {/if}
    </div>
  </div>

  <!-- Children -->
  {#if isExpanded && item.children && item.children.length > 0}
    <div class="ml-6 pl-2 border-l border-zinc-100 dark:border-zinc-800 space-y-1 mt-1">
      {#each item.children as child (child.id)}
        <UnorTreeItem 
          item={child} 
          {onEdit} 
          {onDelete} 
          {onAddChild} 
          {loadChildren}
          {selectedId}
          {onSelect}
          bind:expandedKeys
        />
      {/each}
    </div>
  {:else if isExpanded && (!item.children || item.children.length === 0) && !loadingChildren}
    <div class="ml-10 py-2 text-xs text-zinc-400 italic">
      Tidak ada data di bawah ini.
    </div>
  {/if}
</div>
